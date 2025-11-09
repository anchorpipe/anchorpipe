/**
 * GitHub App Ingestion Trigger Service
 *
 * Fetches test results from GitHub workflow runs and submits them to the ingestion service.
 *
 * Story: ST-301 (Phase 1.3)
 */

// cSpell:ignore anchorpipe pytest
import { prisma } from '@anchorpipe/database';
import { getInstallationToken } from './github-app-tokens';
import { findActiveSecretsForRepo } from './hmac-secrets';
import { computeHmac } from './hmac';
import { logger } from './logger';
import { writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from './audit-service';
import { decryptField } from './secrets';

/**
 * Request metadata for audit logging
 */
interface RequestMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Repository information value object
 */
export interface RepositoryInfo {
  id: number;
  fullName: string;
}

/**
 * Commit information value object
 */
export interface CommitInfo {
  sha: string;
  branch: string;
}

/**
 * Workflow run ingestion parameters
 */
interface WorkflowRunIngestionParams {
  workflowRunId: number;
  repository: RepositoryInfo;
  commit: CommitInfo;
  installationId: number;
  metadata?: RequestMetadata;
}

/**
 * Check run ingestion parameters
 */
interface CheckRunIngestionParams {
  checkRunId: number;
  repository: RepositoryInfo;
  commit: CommitInfo;
  installationId: number;
  metadata?: RequestMetadata;
}

/**
 * Validate repository exists in database
 */
async function validateRepository(
  repositoryId: number,
  repositoryFullName: string
): Promise<{ success: boolean; repo?: { id: string }; error?: string }> {
  const repo = await prisma.repo.findUnique({
    where: { ghId: BigInt(repositoryId) },
  });

  if (!repo) {
    logger.warn('Repository not found in database', {
      repositoryId,
      repositoryFullName,
    });
    return {
      success: false,
      error: 'Repository not found in database',
    };
  }

  return { success: true, repo };
}

/**
 * Process workflow run artifacts and extract test results
 */
async function processWorkflowRunArtifacts(
  workflowRunId: number,
  repositoryFullName: string,
  token: string
): Promise<{ testResults: Array<{ framework: string; payload: string }>; artifactsCount: number }> {
  const artifacts = await fetchWorkflowRunArtifacts(workflowRunId, repositoryFullName, token);

  if (artifacts.length === 0) {
    logger.info('No artifacts found for workflow run', {
      workflowRunId,
      repositoryFullName,
    });
    return { testResults: [], artifactsCount: 0 };
  }

  const testResults = await downloadAndParseArtifacts(artifacts, repositoryFullName, token);

  if (testResults.length === 0) {
    logger.info('No test results found in artifacts', {
      workflowRunId,
      repositoryFullName,
    });
  }

  return { testResults, artifactsCount: artifacts.length };
}

/**
 * Submit all test results to ingestion service
 */
async function submitAllTestResults(
  testResults: Array<{ framework: string; payload: string }>,
  repoId: string,
  commitSha: string,
  workflowRunId: number,
  metadata?: RequestMetadata
): Promise<{ submitted: number; failed: number }> {
  let submitted = 0;
  let failed = 0;

  for (const testResult of testResults) {
    const result = await submitToIngestion({
      repoId,
      commitSha,
      runId: workflowRunId.toString(),
      framework: testResult.framework,
      payload: testResult.payload,
      metadata,
    });

    if (result.success) {
      submitted++;
    } else {
      failed++;
      logger.error('Failed to submit test results to ingestion', {
        workflowRunId,
        repositoryId: repoId,
        framework: testResult.framework,
        error: result.error,
      });
    }
  }

  return { submitted, failed };
}

/**
 * Log ingestion completion audit event
 */
async function logIngestionAudit(
  repoId: string,
  workflowRunId: number,
  repositoryFullName: string,
  commitSha: string,
  commitBranch: string,
  artifactsCount: number,
  testResultsCount: number,
  metadata?: RequestMetadata
): Promise<void> {
  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.repo,
    subjectId: repoId,
    description: `Triggered ingestion for workflow run ${workflowRunId}`,
    metadata: {
      workflowRunId,
      repositoryId: repoId,
      repositoryFullName,
      headSha: commitSha,
      headBranch: commitBranch,
      artifactsProcessed: artifactsCount,
      testResultsSubmitted: testResultsCount,
    },
    ipAddress: metadata?.ipAddress ?? null,
    userAgent: metadata?.userAgent ?? null,
  });
}

/**
 * Trigger ingestion for a completed workflow run
 */
export async function triggerIngestionForWorkflowRun(
  params: WorkflowRunIngestionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Triggering ingestion for workflow run', {
      workflowRunId: params.workflowRunId,
      repositoryId: params.repository.id,
      repositoryFullName: params.repository.fullName,
      headSha: params.commit.sha,
      headBranch: params.commit.branch,
      installationId: params.installationId,
    });

    // Get installation token
    const token = await getInstallationToken(BigInt(params.installationId));

    // Validate repository exists
    const repoValidation = await validateRepository(
      params.repository.id,
      params.repository.fullName
    );
    if (!repoValidation.success || !repoValidation.repo) {
      return { success: false, error: repoValidation.error };
    }

    // Process artifacts and extract test results
    const { testResults, artifactsCount } = await processWorkflowRunArtifacts(
      params.workflowRunId,
      params.repository.fullName,
      token
    );

    if (testResults.length === 0) {
      return { success: true }; // Not an error, just no test results
    }

    // Submit all test results
    const { submitted } = await submitAllTestResults(
      testResults,
      repoValidation.repo.id,
      params.commit.sha,
      params.workflowRunId,
      params.metadata
    );

    // Log audit event
    await logIngestionAudit(
      repoValidation.repo.id,
      params.workflowRunId,
      params.repository.fullName,
      params.commit.sha,
      params.commit.branch,
      artifactsCount,
      submitted,
      params.metadata
    );

    logger.info('Successfully triggered ingestion for workflow run', {
      workflowRunId: params.workflowRunId,
      repositoryId: repoValidation.repo.id,
      testResultsSubmitted: submitted,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to trigger ingestion for workflow run', {
      workflowRunId: params.workflowRunId,
      repositoryId: params.repository.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger ingestion for a completed check run
 */
export async function triggerIngestionForCheckRun(
  params: CheckRunIngestionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Triggering ingestion for check run', {
      checkRunId: params.checkRunId,
      repositoryId: params.repository.id,
      repositoryFullName: params.repository.fullName,
      headSha: params.commit.sha,
      headBranch: params.commit.branch,
      installationId: params.installationId,
    });

    // Find repository in our database
    const repo = await prisma.repo.findUnique({
      where: { ghId: BigInt(params.repository.id) },
    });

    if (!repo) {
      logger.warn('Repository not found in database', {
        repositoryId: params.repository.id,
        repositoryFullName: params.repository.fullName,
      });
      return {
        success: false,
        error: 'Repository not found in database',
      };
    }

    // For check runs, we might need to fetch from check suite or workflow run
    // This is a simplified version - in practice, we'd need to determine
    // if the check run is part of a workflow run or standalone
    logger.info('Check run ingestion not fully implemented yet', {
      checkRunId: params.checkRunId,
      repositoryFullName: params.repository.fullName,
    });

    // TODO: Implement check run artifact fetching
    // Check runs don't always have artifacts, so this might need different handling

    return { success: true };
  } catch (error) {
    logger.error('Failed to trigger ingestion for check run', {
      checkRunId: params.checkRunId,
      repositoryId: params.repository.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch workflow run artifacts from GitHub API
 */
async function fetchWorkflowRunArtifacts(
  workflowRunId: number,
  repositoryFullName: string,
  token: string
): Promise<Array<{ id: number; name: string; size_in_bytes: number }>> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/actions/runs/${workflowRunId}/artifacts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Workflow run might not have artifacts, or we don't have access
        return [];
      }
      const error = await response.text();
      throw new Error(`Failed to fetch artifacts: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      artifacts: Array<{ id: number; name: string; size_in_bytes: number }>;
    };

    return data.artifacts || [];
  } catch (error) {
    logger.error('Failed to fetch workflow run artifacts', {
      workflowRunId,
      repositoryFullName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Download and parse artifacts to extract test results
 */
async function downloadAndParseArtifacts(
  artifacts: Array<{ id: number; name: string; size_in_bytes: number }>,
  repositoryFullName: string,
  token: string
): Promise<Array<{ framework: string; payload: string }>> {
  const testResults: Array<{ framework: string; payload: string }> = [];

  for (const artifact of artifacts) {
    // Only process artifacts that look like test results
    if (!isTestResultArtifact(artifact.name)) {
      continue;
    }

    try {
      // Download artifact
      const artifactData = await downloadArtifact(artifact.id, repositoryFullName, token);
      if (!artifactData) {
        continue;
      }

      // Determine framework from artifact name
      const framework = detectFramework(artifact.name);
      if (!framework) {
        logger.debug('Could not detect framework for artifact', {
          artifactName: artifact.name,
        });
        continue;
      }

      // Parse artifact (for now, we'll pass the raw data)
      // In a full implementation, we'd parse JUnit XML, Jest JSON, etc.
      testResults.push({
        framework,
        payload: artifactData,
      });
    } catch (error) {
      logger.error('Failed to download or parse artifact', {
        artifactId: artifact.id,
        artifactName: artifact.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with other artifacts
    }
  }

  return testResults;
}

/**
 * Check if an artifact name suggests it contains test results
 */
function isTestResultArtifact(name: string): boolean {
  const testResultPatterns = [
    /test.*result/i,
    /junit/i,
    /jest/i,
    /pytest/i,
    /mocha/i,
    /playwright/i,
    /\.xml$/i,
    /\.json$/i,
  ];

  return testResultPatterns.some((pattern) => pattern.test(name));
}

/**
 * Detect framework from artifact name or content
 */
function detectFramework(name: string): string | null {
  if (/junit/i.test(name) || /\.xml$/i.test(name)) {
    return 'junit';
  }
  if (/jest/i.test(name)) {
    return 'jest';
  }
  if (/pytest/i.test(name)) {
    return 'pytest';
  }
  if (/mocha/i.test(name)) {
    return 'mocha';
  }
  if (/playwright/i.test(name)) {
    return 'playwright';
  }

  return null;
}

/**
 * Download artifact from GitHub
 * Note: This is a simplified implementation. In production, we'd:
 * 1. Download the ZIP file
 * 2. Extract files from the ZIP
 * 3. Parse test result files (JUnit XML, Jest JSON, etc.)
 * 4. Return structured test data
 */
async function downloadArtifact(
  artifactId: number,
  repositoryFullName: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/actions/artifacts/${artifactId}/zip`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Artifact might have expired or been deleted
        return null;
      }
      const error = await response.text();
      throw new Error(`Failed to download artifact: ${response.status} ${error}`);
    }

    // For now, return as text (in production, we'd handle ZIP extraction)
    // This is a simplified version - actual implementation would:
    // 1. Download ZIP
    // 2. Extract files using a ZIP library (e.g., yauzl, adm-zip)
    // 3. Parse test result files (JUnit XML, Jest JSON, PyTest JSON, etc.)
    // 4. Return structured test data
    const data = await response.text();
    return data;
  } catch (error) {
    logger.error('Failed to download artifact', {
      artifactId,
      repositoryFullName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Ingestion submission parameters
 */
interface IngestionSubmissionParams {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
  payload: string;
  metadata?: RequestMetadata;
}

/**
 * Get and decrypt HMAC secret for repository
 */
async function getHmacSecretForRepo(
  repoId: string
): Promise<{ success: boolean; secret?: string; error?: string }> {
  const secrets = await findActiveSecretsForRepo(repoId);
  if (secrets.length === 0) {
    logger.warn('No active HMAC secrets found for repository', { repoId });
    return {
      success: false,
      error: 'No active HMAC secrets found for repository',
    };
  }

  const secret = secrets[0];
  const decryptedSecret = decryptField(secret.secretValue);
  if (!decryptedSecret) {
    return {
      success: false,
      error: 'Failed to decrypt HMAC secret',
    };
  }

  return { success: true, secret: decryptedSecret };
}

/**
 * Get ingestion endpoint URL
 */
function getIngestionUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  return `${baseUrl}/api/ingestion`;
}

/**
 * Submit payload to ingestion endpoint
 */
async function submitPayloadToIngestion(
  ingestionUrl: string,
  repoId: string,
  signature: string,
  payload: string
): Promise<{ success: boolean; response?: Response; error?: string }> {
  const response = await fetch(ingestionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${repoId}`,
      'X-FR-Sig': signature,
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to submit to ingestion endpoint', {
      repoId,
      status: response.status,
      error,
    });
    return {
      success: false,
      error: `Ingestion endpoint returned ${response.status}: ${error}`,
    };
  }

  return { success: true, response };
}

/**
 * Submit test results to ingestion endpoint with HMAC authentication
 */
async function submitToIngestion(
  params: IngestionSubmissionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get HMAC secret
    const secretResult = await getHmacSecretForRepo(params.repoId);
    if (!secretResult.success || !secretResult.secret) {
      return { success: false, error: secretResult.error };
    }

    // Compute HMAC signature
    const signature = computeHmac(secretResult.secret, params.payload);

    // Get ingestion endpoint URL
    const ingestionUrl = getIngestionUrl();

    // Submit to ingestion endpoint
    const submitResult = await submitPayloadToIngestion(
      ingestionUrl,
      params.repoId,
      signature,
      params.payload
    );
    if (!submitResult.success || !submitResult.response) {
      return { success: false, error: submitResult.error };
    }

    // Parse response
    const result = (await submitResult.response.json()) as {
      runId: string;
      message: string;
      summary?: {
        tests_parsed: number;
        flaky_candidates: number;
      };
    };

    logger.info('Successfully submitted test results to ingestion', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      framework: params.framework,
      ingestionRunId: result.runId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to submit to ingestion endpoint', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      framework: params.framework,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
