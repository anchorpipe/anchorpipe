/**
 * Elasticsearch SIEM Adapter
 *
 * Forwards audit logs to Elasticsearch for indexing.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { logger } from '../logger';
import { SiemAdapter, SiemAdapterConfig, SiemLogEntry, SiemForwardResult } from '../siem-adapter';

interface ElasticsearchAdapterConfig {
  url: string;
  index: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

/**
 * Create Elasticsearch SIEM adapter
 */
export function createElasticsearchAdapter(
  config: ElasticsearchAdapterConfig,
  siemConfig: SiemAdapterConfig
): SiemAdapter {
  const timeout = siemConfig.timeout || 5000;

  return {
    async forwardLog(log: SiemLogEntry): Promise<{ success: boolean; error?: string }> {
      try {
        const indexUrl = `${config.url}/${config.index}/_doc`;
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add authentication
        if (config.apiKey) {
          headers['Authorization'] = `ApiKey ${config.apiKey}`;
        } else if (config.username && config.password) {
          const credentials = btoa(`${config.username}:${config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(indexUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(log),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return {
            success: false,
            error: `Elasticsearch ${response.status}: ${errorText}`,
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    async forwardBatch(logs: SiemLogEntry[]): Promise<SiemForwardResult> {
      const result: SiemForwardResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Elasticsearch supports bulk indexing
      try {
        const bulkBody = logs
          .map((log) => {
            const action = { index: { _index: config.index } };
            return `${JSON.stringify(action)}\n${JSON.stringify(log)}\n`;
          })
          .join('');

        const headers: HeadersInit = {
          'Content-Type': 'application/x-ndjson',
        };

        // Add authentication
        if (config.apiKey) {
          headers['Authorization'] = `ApiKey ${config.apiKey}`;
        } else if (config.username && config.password) {
          const credentials = btoa(`${config.username}:${config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout * logs.length);

        const response = await fetch(`${config.url}/_bulk`, {
          method: 'POST',
          headers,
          body: bulkBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return {
            success: 0,
            failed: logs.length,
            errors: logs.map((log) => ({
              logId: log.id,
              error: `Elasticsearch ${response.status}: ${errorText}`,
            })),
          };
        }

        const responseData = await response.json();
        // Check for individual item errors
        if (responseData.items) {
          responseData.items.forEach((item: any, index: number) => {
            if (item.index?.error) {
              result.failed++;
              result.errors?.push({
                logId: logs[index].id,
                error: item.index.error.reason || 'Unknown error',
              });
            } else {
              result.success++;
            }
          });
        } else {
          result.success = logs.length;
        }

        return result;
      } catch (error) {
        return {
          success: 0,
          failed: logs.length,
          errors: logs.map((log) => ({
            logId: log.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })),
        };
      }
    },

    async testConnection(): Promise<{ success: boolean; error?: string }> {
      try {
        // Test Elasticsearch connectivity
        const headers: HeadersInit = {};

        if (config.apiKey) {
          headers['Authorization'] = `ApiKey ${config.apiKey}`;
        } else if (config.username && config.password) {
          const credentials = btoa(`${config.username}:${config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${config.url}/_cluster/health`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return {
            success: false,
            error: `Elasticsearch ${response.status}: ${errorText}`,
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}
