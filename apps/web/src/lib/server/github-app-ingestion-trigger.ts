/**
 * GitHub App Ingestion Trigger Service
 *
 * Fetches test results from GitHub workflow runs and submits them to the ingestion service.
 *
 * Story: ST-301 (Phase 1.3)
 */

import { prisma } from '@anchorpipe/database';
import { getInstallationToken } from './github-app-tokens';
import { findActiveSecretsForRepo } from './hmac-secrets';
import { computeHmac } from './hmac';
import { logger } from './logger';
import { writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from './audit-service';
import { decryptField } from './secrets';

/**
 * Trigger ingestion for a completed workflow run
 */
export async function triggerIngestionForWorkflowRun(
  workflowRunId: number,
  repositoryId: number,
  repositoryFullName: string,
  headSha: string,
  headBranch: string,
  installationId: number,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Triggering ingestion for workflow run', {
      workflowRunId,
      repositoryId,
      repositoryFullName,
      headSha,
      headBranch,
      installationId,
    });

    // Get installation token
    const token = await getInstallationToken(BigInt(installationId));

    // Find repository in our database
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

    // Fetch workflow run artifacts
    const artifacts = await fetchWorkflowRunArtifacts(
      workflowRunId,
      repositoryFullName,
      token
    );

    if (artifacts.length === 0) {
      logger.info('No artifacts found for workflow run', {
        workflowRunId,
        repositoryFullName,
      });
      return { success: true }; // Not an error, just no test results
    }

    // Download and parse test results from artifacts
    const testResults = await downloadAndParseArtifacts(
      artifacts,
      repositoryFullName,
      token
    );

    if (testResults.length === 0) {
      logger.info('No test results found in artifacts', {
        workflowRunId,
        repositoryFullName,
      });
      return { success: true }; // Not an error, just no test results
    }

    // Submit test results to ingestion endpoint
    for (const testResult of testResults) {
      const result = await submitToIngestion(
        repo.id,
        headSha,
        workflowRunId.toString(),
        testResult.framework,
        testResult.payload,
        metadata
      );

      if (!result.success) {
        logger.error('Failed to submit test results to ingestion', {
          workflowRunId,
          repositoryId: repo.id,
          framework: testResult.framework,
          error: result.error,
        });
        // Continue with other test results even if one fails
      }
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.repo,
      subjectId: repo.id,
      description: `Triggered ingestion for workflow run ${workflowRunId}`,
      metadata: {
        workflowRunId,
        repositoryId: repo.id,
        repositoryFullName,
        headSha,
        headBranch,
        artifactsProcessed: artifacts.length,
        testResultsSubmitted: testResults.length,
      },
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    logger.info('Successfully triggered ingestion for workflow run', {
      workflowRunId,
      repositoryId: repo.id,
      testResultsSubmitted: testResults.length,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to trigger ingestion for workflow run', {
      workflowRunId,
      repositoryId,
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
  checkRunId: number,
  repositoryId: number,
  repositoryFullName: string,
  headSha: string,
  headBranch: string,
  installationId: number,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Triggering ingestion for check run', {
      checkRunId,
      repositoryId,
      repositoryFullName,
      headSha,
      headBranch,
      installationId,
    });

    // Get installation token
    const token = await getInstallationToken(BigInt(installationId));

    // Find repository in our database
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

    // For check runs, we might need to fetch from check suite or workflow run
    // This is a simplified version - in practice, we'd need to determine
    // if the check run is part of a workflow run or standalone
    logger.info('Check run ingestion not fully implemented yet', {
      checkRunId,
      repositoryFullName,
    });

    // TODO: Implement check run artifact fetching
    // Check runs don't always have artifacts, so this might need different handling

    return { success: true };
  } catch (error) {
    logger.error('Failed to trigger ingestion for check run', {
      checkRunId,
      repositoryId,
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
 * Submit test results to ingestion endpoint with HMAC authentication
 */
async function submitToIngestion(
  repoId: string,
  commitSha: string,
  runId: string,
  framework: string,
  payload: string,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get active HMAC secrets for this repository
    const secrets = await findActiveSecretsForRepo(repoId);
    if (secrets.length === 0) {
      logger.warn('No active HMAC secrets found for repository', { repoId });
      return {
        success: false,
        error: 'No active HMAC secrets found for repository',
      };
    }

    // Use the first active secret
    const secret = secrets[0];
    const decryptedSecret = decryptField(secret.secretValue);
    if (!decryptedSecret) {
      return {
        success: false,
        error: 'Failed to decrypt HMAC secret',
      };
    }

    // Compute HMAC signature
    const signature = computeHmac(decryptedSecret, payload);

    // Get ingestion endpoint URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const ingestionUrl = `${baseUrl}/api/ingestion`;

    // Submit to ingestion endpoint
    const response = await fetch(ingestionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${repoId}`,
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

    logger.info('Successfully submitted test results to ingestion', {
      repoId,
      commitSha,
      runId,
      framework,
      ingestionRunId: result.runId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to submit to ingestion endpoint', {
      repoId,
      commitSha,
      runId,
      framework,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

