/**
 * HTTP SIEM Adapter
 *
 * Forwards audit logs to SIEM systems via HTTP/HTTPS.
 * Supports JSON, CEF, and LEEF formats.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { logger } from '../logger';
import {
  SiemAdapter,
  SiemAdapterConfig,
  SiemLogEntry,
  SiemForwardResult,
  formatAsCEF,
  formatAsLEEF,
} from '../siem-adapter';

interface HttpAdapterConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Create HTTP SIEM adapter
 */
export function createHttpAdapter(
  config: HttpAdapterConfig,
  siemConfig: SiemAdapterConfig
): SiemAdapter {
  const format = siemConfig.format || 'json';
  const timeout = siemConfig.timeout || 5000;

  return {
    async forwardLog(log: SiemLogEntry): Promise<{ success: boolean; error?: string }> {
      try {
        const body = formatLogEntry(log, format);
        const headers = buildHeaders(config, format);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(config.url, {
          method: config.method || 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
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

      for (const log of logs) {
        const forwardResult = await this.forwardLog(log);
        if (forwardResult.success) {
          result.success++;
        } else {
          result.failed++;
          result.errors?.push({
            logId: log.id,
            error: forwardResult.error || 'Unknown error',
          });
        }
      }

      return result;
    },

    async testConnection(): Promise<{ success: boolean; error?: string }> {
      try {
        const testLog: SiemLogEntry = {
          id: 'test',
          timestamp: new Date().toISOString(),
          action: 'test',
          subject: 'system',
          description: 'SIEM connection test',
          severity: 'info',
        };

        return await this.forwardLog(testLog);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}

/**
 * Format log entry based on format type
 */
function formatLogEntry(log: SiemLogEntry, format: string): string {
  switch (format) {
    case 'cef':
      return formatAsCEF(log);
    case 'leef':
      return formatAsLEEF(log);
    case 'json':
    default:
      return JSON.stringify(log);
  }
}

/**
 * Build HTTP headers
 */
function buildHeaders(config: HttpAdapterConfig, format: string): HeadersInit {
  const headers: HeadersInit = {
    ...config.headers,
  };

  // Set content type based on format
  if (!headers['Content-Type']) {
    switch (format) {
      case 'cef':
      case 'leef':
        headers['Content-Type'] = 'text/plain';
        break;
      case 'json':
      default:
        headers['Content-Type'] = 'application/json';
        break;
    }
  }

  // Add authentication
  if (config.auth) {
    if (config.auth.type === 'bearer' && config.auth.token) {
      headers['Authorization'] = `Bearer ${config.auth.token}`;
    } else if (config.auth.type === 'basic' && config.auth.username && config.auth.password) {
      const credentials = btoa(`${config.auth.username}:${config.auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }
  }

  return headers;
}
