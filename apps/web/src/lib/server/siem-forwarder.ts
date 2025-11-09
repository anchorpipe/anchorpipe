/**
 * SIEM Forwarder
 *
 * Service for forwarding audit logs to SIEM systems with batch processing,
 * retry logic, and error handling.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { logger } from './logger';
import {
  SiemAdapter,
  SiemAdapterConfig,
  SiemLogEntry,
  SiemForwardResult,
  convertAuditLogToSiemEntry,
} from './siem-adapter';
import { createSyslogAdapter } from './siem-adapters/syslog-adapter';
import { createHttpAdapter } from './siem-adapters/http-adapter';
import { createSplunkAdapter } from './siem-adapters/splunk-adapter';
import { createElasticsearchAdapter } from './siem-adapters/elasticsearch-adapter';

/**
 * Get SIEM adapter instance based on configuration
 */
function createSiemAdapter(config: SiemAdapterConfig): SiemAdapter | null {
  if (!config.enabled) {
    return null;
  }

  switch (config.type) {
    case 'syslog':
      if (!config.syslog) {
        logger.warn('SIEM syslog adapter requires syslog configuration');
        return null;
      }
      return createSyslogAdapter(config.syslog, config);

    case 'http':
      if (!config.http) {
        logger.warn('SIEM HTTP adapter requires http configuration');
        return null;
      }
      return createHttpAdapter(config.http, config);

    case 'splunk':
      if (!config.splunk) {
        logger.warn('SIEM Splunk adapter requires splunk configuration');
        return null;
      }
      return createSplunkAdapter(config.splunk, config);

    case 'elasticsearch':
      if (!config.elasticsearch) {
        logger.warn('SIEM Elasticsearch adapter requires elasticsearch configuration');
        return null;
      }
      return createElasticsearchAdapter(config.elasticsearch, config);

    default:
      logger.warn(`Unknown SIEM adapter type: ${config.type}`);
      return null;
  }
}

/**
 * Get SIEM configuration from environment variables
 */
function getSiemConfig(): SiemAdapterConfig | null {
  const enabled = process.env.SIEM_ENABLED === 'true';
  if (!enabled) {
    return null;
  }

  const type = (process.env.SIEM_TYPE as SiemAdapterConfig['type']) || 'http';
  const batchSize = parseInt(process.env.SIEM_BATCH_SIZE || '50', 10);
  const retryAttempts = parseInt(process.env.SIEM_RETRY_ATTEMPTS || '3', 10);
  const retryDelay = parseInt(process.env.SIEM_RETRY_DELAY || '1000', 10);
  const timeout = parseInt(process.env.SIEM_TIMEOUT || '5000', 10);

  const config: SiemAdapterConfig = {
    type,
    enabled: true,
    batchSize,
    retryAttempts,
    retryDelay,
    timeout,
  };

  // Configure based on type
  switch (type) {
    case 'syslog':
      config.syslog = {
        host: process.env.SIEM_SYSLOG_HOST || 'localhost',
        port: parseInt(process.env.SIEM_SYSLOG_PORT || '514', 10),
        protocol: (process.env.SIEM_SYSLOG_PROTOCOL as 'udp' | 'tcp' | 'tls') || 'udp',
        facility: parseInt(process.env.SIEM_SYSLOG_FACILITY || '16', 10), // Local0
        tag: process.env.SIEM_SYSLOG_TAG || 'anchorpipe',
      };
      break;

    case 'http':
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.SIEM_HTTP_HEADERS) {
        try {
          const parsed = JSON.parse(process.env.SIEM_HTTP_HEADERS);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            headers = { ...headers, ...parsed };
          }
        } catch (error) {
          logger.warn('Failed to parse SIEM_HTTP_HEADERS, using defaults', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      config.http = {
        url: process.env.SIEM_HTTP_URL || '',
        method: (process.env.SIEM_HTTP_METHOD as 'POST' | 'PUT') || 'POST',
        headers,
        auth: process.env.SIEM_HTTP_AUTH_TOKEN
          ? { type: 'bearer', token: process.env.SIEM_HTTP_AUTH_TOKEN }
          : process.env.SIEM_HTTP_AUTH_USERNAME && process.env.SIEM_HTTP_AUTH_PASSWORD
            ? {
                type: 'basic',
                username: process.env.SIEM_HTTP_AUTH_USERNAME,
                password: process.env.SIEM_HTTP_AUTH_PASSWORD,
              }
            : undefined,
      };
      break;

    case 'splunk':
      config.splunk = {
        host: process.env.SIEM_SPLUNK_HOST || 'localhost',
        port: parseInt(process.env.SIEM_SPLUNK_PORT || '8088', 10),
        token: process.env.SIEM_SPLUNK_TOKEN || '',
        index: process.env.SIEM_SPLUNK_INDEX,
        source: process.env.SIEM_SPLUNK_SOURCE || 'anchorpipe',
        sourcetype: process.env.SIEM_SPLUNK_SOURCETYPE || 'anchorpipe:audit',
      };
      break;

    case 'elasticsearch':
      config.elasticsearch = {
        url: process.env.SIEM_ELASTICSEARCH_URL || 'http://localhost:9200',
        index: process.env.SIEM_ELASTICSEARCH_INDEX || 'anchorpipe-audit',
        username: process.env.SIEM_ELASTICSEARCH_USERNAME,
        password: process.env.SIEM_ELASTICSEARCH_PASSWORD,
        apiKey: process.env.SIEM_ELASTICSEARCH_API_KEY,
      };
      break;
  }

  return config;
}

/**
 * SIEM forwarder service
 */
class SiemForwarderService {
  private adapter: SiemAdapter | null = null;
  private config: SiemAdapterConfig | null = null;
  private lastProcessedId: string | null = null;

  /**
   * Initialize SIEM forwarder
   */
  initialize(): void {
    this.config = getSiemConfig();
    if (!this.config) {
      logger.info('SIEM forwarding disabled');
      return;
    }

    this.adapter = createSiemAdapter(this.config);
    if (!this.adapter) {
      logger.warn('Failed to create SIEM adapter');
      return;
    }

    logger.info('SIEM forwarder initialized', {
      type: this.config.type,
      batchSize: this.config.batchSize,
    });
  }

  /**
   * Forward audit logs to SIEM (batch processing)
   */
  async forwardAuditLogs(batchSize?: number): Promise<SiemForwardResult> {
    if (!this.adapter || !this.config) {
      return { success: 0, failed: 0 };
    }

    const size = batchSize || this.config.batchSize || 50;

    try {
      // Fetch audit logs that haven't been forwarded yet
      const logs = await this.fetchUnprocessedLogs(size);

      if (logs.length === 0) {
        return { success: 0, failed: 0 };
      }

      // Convert to SIEM format
      const siemEntries = logs.map(convertAuditLogToSiemEntry);

      // Forward to SIEM with retry logic
      const result = await this.forwardWithRetry(siemEntries);

      // Update last processed ID
      if (result.success > 0) {
        this.lastProcessedId = logs[result.success - 1]?.id || this.lastProcessedId;
      }

      logger.info('SIEM forwarding completed', {
        total: logs.length,
        success: result.success,
        failed: result.failed,
      });

      return result;
    } catch (error) {
      logger.error('SIEM forwarding failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Fetch unprocessed audit logs
   */
  private async fetchUnprocessedLogs(limit: number) {
    const logs = await prisma.auditLog.findMany({
      where: this.lastProcessedId
        ? {
            id: {
              gt: this.lastProcessedId,
            },
          }
        : {},
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      include: {
        actor: {
          select: {
            email: true,
          },
        },
      },
    });

    return logs;
  }

  /**
   * Forward logs with retry logic
   */
  private async forwardWithRetry(
    entries: SiemLogEntry[],
    attempt: number = 1
  ): Promise<SiemForwardResult> {
    const maxAttempts = this.config?.retryAttempts || 3;

    try {
      const result = await this.adapter!.forwardBatch(entries);

      // If some failed and we have retries left, retry failed entries
      if (result.failed > 0 && attempt < maxAttempts) {
        const failedEntries = entries.filter((entry) => {
          const error = result.errors?.find((e) => e.logId === entry.id);
          return error !== undefined;
        });

        if (failedEntries.length > 0) {
          // Wait before retry
          await this.delay(this.config?.retryDelay || 1000);

          // Retry failed entries
          const retryResult = await this.forwardWithRetry(failedEntries, attempt + 1);
          return {
            success: result.success + retryResult.success,
            failed: retryResult.failed,
            errors: [...(result.errors || []), ...(retryResult.errors || [])],
          };
        }
      }

      return result;
    } catch (error) {
      if (attempt < maxAttempts) {
        await this.delay(this.config?.retryDelay || 1000);
        return this.forwardWithRetry(entries, attempt + 1);
      }

      logger.error('SIEM forwarding failed after retries', {
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: 0,
        failed: entries.length,
        errors: entries.map((entry) => ({
          logId: entry.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      };
    }
  }

  /**
   * Test SIEM connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.adapter) {
      return { success: false, error: 'SIEM adapter not initialized' };
    }

    return await this.adapter.testConnection();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global SIEM forwarder instance
 */
let siemForwarderInstance: SiemForwarderService | null = null;

/**
 * Get SIEM forwarder instance
 */
export function getSiemForwarder(): SiemForwarderService {
  if (!siemForwarderInstance) {
    siemForwarderInstance = new SiemForwarderService();
    siemForwarderInstance.initialize();
  }

  return siemForwarderInstance;
}

/**
 * Forward audit logs to SIEM (convenience function)
 */
export async function forwardAuditLogsToSiem(batchSize?: number): Promise<SiemForwardResult> {
  const forwarder = getSiemForwarder();
  return await forwarder.forwardAuditLogs(batchSize);
}
