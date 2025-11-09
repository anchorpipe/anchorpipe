/**
 * GitHub App Ingestion Trigger Service
 *
 * Fetches test results from GitHub workflow runs and submits them to the ingestion service.
 *
 * Story: ST-301 (Phase 1.3)
 */

// cSpell:ignore anchorpipe
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
interface RepositoryInfo {
  id: number;
  fullName: string;
}

/**
 * Commit information value object
 */
interface CommitInfo {
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
 * Test result from artifact parsing
 */
interface TestResult {
  framework: string;
  payload: string;
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
 * GitHub artifact structure
 */
interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

/**
 * Find repository by GitHub ID
 */
async function findRepositoryByGitHubId(
  repositoryId: number
): Promise<{ id: string; name: string; owner: string } | null> {
  const repo = await prisma.repo.findUnique({
    where: { ghId: BigInt(repositoryId) },
  });

  return repo;
}

/**
 * Process and submit test results from artifacts
 */
async function processAndSubmitTestResults(
  testResults: TestResult[],
  params: {
    repoId: string;
    headSha: string;
    runId: string;
    metadata?: RequestMetadata;
  }
): Promise<void> {
  for (const testResult of testResults) {
    const submissionParams: IngestionSubmissionParams = {
      repoId: params.repoId,
      commitSha: params.headSha,
      runId: params.runId,
      framework: testResult.framework,
      payload: testResult.payload,
      metadata: params.metadata,
    };

    const result = await submitToIngestion(submissionParams);

    if (!result.success) {
      logger.error('Failed to submit test results to ingestion', {
        repoId: params.repoId,
        runId: params.runId,
        framework: testResult.framework,
        error: result.error,
      });
      // Continue with other test results even if one fails
    }
  }
}

/**
 * Log ingestion completion
 */
async function logIngestionCompletion(params: {
  workflowRunId: number;
  repoId: string;
  repositoryFullName: string;
  headSha: string;
  headBranch: string;
  artifactsProcessed: number;
  testResultsSubmitted: number;
  metadata?: RequestMetadata;
}): Promise<void> {
  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.repo,
    subjectId: params.repoId,
    description: `Triggered ingestion for workflow run ${params.workflowRunId}`,
    metadata: {
      workflowRunId: params.workflowRunId,
      repositoryId: params.repoId,
      repositoryFullName: params.repositoryFullName,
      headSha: params.headSha,
      headBranch: params.headBranch,
      artifactsProcessed: params.artifactsProcessed,
      testResultsSubmitted: params.testResultsSubmitted,
    },
    ipAddress: params.metadata?.ipAddress ?? null,
    userAgent: params.metadata?.userAgent ?? null,
  });

  logger.info('Successfully triggered ingestion for workflow run', {
    workflowRunId: params.workflowRunId,
    repositoryId: params.repoId,
    testResultsSubmitted: params.testResultsSubmitted,
  });
}

/**
 * Prepare workflow run ingestion context
 */
async function prepareWorkflowRunContext(params: {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
}): Promise<{
  token: string;
  repo: { id: string; name: string; owner: string } | null;
}> {
  const token = await getInstallationToken(BigInt(params.installationId));
  const repo = await findRepositoryByGitHubId(params.repositoryId);

  return { token, repo };
}

/**
 * Fetch and process artifacts for workflow run
 */
async function fetchAndProcessArtifacts(params: {
  workflowRunId: number;
  repositoryFullName: string;
  token: string;
}): Promise<{ artifacts: GitHubArtifact[]; testResults: TestResult[] }> {
  const artifacts = await fetchWorkflowRunArtifacts(
    params.workflowRunId,
    params.repositoryFullName,
    params.token
  );

  if (artifacts.length === 0) {
    return { artifacts: [], testResults: [] };
  }

  const testResults = await downloadAndParseArtifacts(
    artifacts,
    params.repositoryFullName,
    params.token
  );

  return { artifacts, testResults };
}

/**
 * Validate repository exists in database
 */
function validateRepository(
  repo: { id: string; name: string; owner: string } | null,
  repositoryInfo: RepositoryInfo
): { isValid: boolean; repoId?: string; error?: string } {
  if (!repo) {
    logger.warn('Repository not found in database', {
      repositoryId: repositoryInfo.id,
      repositoryFullName: repositoryInfo.fullName,
    });
    return {
      isValid: false,
      error: 'Repository not found in database',
    };
  }

  return { isValid: true, repoId: repo.id };
}

/**
 * Handle empty artifacts or test results
 */
function handleEmptyResults(
  type: 'artifacts' | 'testResults',
  workflowRunId: number,
  repositoryFullName: string
): { shouldContinue: boolean } {
  logger.info(
    type === 'artifacts'
      ? 'No artifacts found for workflow run'
      : 'No test results found in artifacts',
    {
      workflowRunId,
      repositoryFullName,
    }
  );
  return { shouldContinue: false };
}

/**
 * Process workflow run ingestion workflow
 */
async function processWorkflowRunIngestion(params: {
  workflowRunId: number;
  repository: RepositoryInfo;
  commit: CommitInfo;
  repoId: string;
  artifacts: GitHubArtifact[];
  testResults: TestResult[];
  metadata?: RequestMetadata;
}): Promise<void> {
  // Submit test results to ingestion endpoint
  await processAndSubmitTestResults(params.testResults, {
    repoId: params.repoId,
    headSha: params.commit.sha,
    runId: params.workflowRunId.toString(),
    metadata: params.metadata,
  });

  // Log completion
  await logIngestionCompletion({
    workflowRunId: params.workflowRunId,
    repoId: params.repoId,
    repositoryFullName: params.repository.fullName,
    headSha: params.commit.sha,
    headBranch: params.commit.branch,
    artifactsProcessed: params.artifacts.length,
    testResultsSubmitted: params.testResults.length,
    metadata: params.metadata,
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

    // Prepare context (token and repository lookup)
    const { token, repo } = await prepareWorkflowRunContext({
      installationId: params.installationId,
      repositoryId: params.repository.id,
      repositoryFullName: params.repository.fullName,
    });

    // Validate repository
    const repoValidation = validateRepository(repo, params.repository);
    if (!repoValidation.isValid) {
      return {
        success: false,
        error: repoValidation.error,
      };
    }

    // Fetch and process artifacts
    const { artifacts, testResults } = await fetchAndProcessArtifacts({
      workflowRunId: params.workflowRunId,
      repositoryFullName: params.repository.fullName,
      token,
    });

    // Handle empty results
    if (artifacts.length === 0) {
      handleEmptyResults('artifacts', params.workflowRunId, params.repository.fullName);
      return { success: true };
    }

    if (testResults.length === 0) {
      handleEmptyResults('testResults', params.workflowRunId, params.repository.fullName);
      return { success: true };
    }

    // Process ingestion
    await processWorkflowRunIngestion({
      workflowRunId: params.workflowRunId,
      repository: params.repository,
      commit: params.commit,
      repoId: repoValidation.repoId!,
      artifacts,
      testResults,
      metadata: params.metadata,
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

    // Prepare context (repository lookup)
    const { repo } = await prepareWorkflowRunContext({
      installationId: params.installationId,
      repositoryId: params.repository.id,
      repositoryFullName: params.repository.fullName,
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
): Promise<GitHubArtifact[]> {
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
      artifacts: GitHubArtifact[];
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
  artifacts: GitHubArtifact[],
  repositoryFullName: string,
  token: string
): Promise<TestResult[]> {
  const testResults: TestResult[] = [];

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
 * Framework detection patterns
 */
const FRAMEWORK_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /junit/i, name: 'junit' },
  { pattern: /\.xml$/i, name: 'junit' },
  { pattern: /jest/i, name: 'jest' },
  // cSpell:ignore pytest
  { pattern: /pytest/i, name: 'pytest' },
  { pattern: /mocha/i, name: 'mocha' },
  { pattern: /playwright/i, name: 'playwright' },
];

/**
 * Detect framework from artifact name or content
 */
function detectFramework(name: string): string | null {
  for (const { pattern, name: frameworkName } of FRAMEWORK_PATTERNS) {
    if (pattern.test(name)) {
      return frameworkName;
    }
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
 * Get HMAC secret for repository
 */
async function getHmacSecretForRepo(repoId: string): Promise<string | null> {
  const secrets = await findActiveSecretsForRepo(repoId);
  if (secrets.length === 0) {
    logger.warn('No active HMAC secrets found for repository', { repoId });
    return null;
  }

  const secret = secrets[0];
  const decryptedSecret = decryptField(secret.secretValue);
  return decryptedSecret;
}

/**
 * Get ingestion endpoint URL
 */
function getIngestionEndpointUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  return `${baseUrl}/api/ingestion`;
}

/**
 * Submit request to ingestion endpoint
 */
async function sendIngestionRequest(
  url: string,
  repoId: string,
  signature: string,
  payload: string
): Promise<{ success: boolean; error?: string; runId?: string }> {
  const response = await fetch(url, {
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

  const result = (await response.json()) as {
    runId: string;
    message: string;
    summary?: {
      tests_parsed: number;
      flaky_candidates: number;
    };
  };

  return { success: true, runId: result.runId };
}

/**
 * Submit test results to ingestion endpoint with HMAC authentication
 */
async function submitToIngestion(
  params: IngestionSubmissionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get active HMAC secret for this repository
    const secret = await getHmacSecretForRepo(params.repoId);
    if (!secret) {
      return {
        success: false,
        error: 'No active HMAC secrets found for repository',
      };
    }

    // Compute HMAC signature
    const signature = computeHmac(secret, params.payload);

    // Get ingestion endpoint URL
    const ingestionUrl = getIngestionEndpointUrl();

    // Submit to ingestion endpoint
    const result = await sendIngestionRequest(
      ingestionUrl,
      params.repoId,
      signature,
      params.payload
    );

    if (!result.success) {
      return result;
    }

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
