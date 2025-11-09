/**
 * Splunk SIEM Adapter
 *
 * Forwards audit logs to Splunk via HTTP Event Collector (HEC).
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { logger } from '../logger';
import { SiemAdapter, SiemAdapterConfig, SiemLogEntry, SiemForwardResult } from '../siem-adapter';

interface SplunkAdapterConfig {
  host: string;
  port: number;
  token: string;
  index?: string;
  source?: string;
  sourcetype?: string;
}

/**
 * Create Splunk SIEM adapter
 */
/**
 * Validate hostname to prevent SSRF attacks
 */
function validateHostname(hostname: string): boolean {
  // Reject localhost and private IP ranges
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    return false;
  }
  return true;
}

export function createSplunkAdapter(
  config: SplunkAdapterConfig,
  siemConfig: SiemAdapterConfig
): SiemAdapter {
  // Validate hostname
  if (!validateHostname(config.host)) {
    throw new Error('Invalid Splunk host: must not be localhost or private IP');
  }

  const baseUrl = `https://${config.host}:${config.port}/services/collector/event`;
  const timeout = siemConfig.timeout || 5000;

  return {
    async forwardLog(log: SiemLogEntry): Promise<{ success: boolean; error?: string }> {
      try {
        const splunkEvent = {
          time: Math.floor(new Date(log.timestamp).getTime() / 1000),
          host: config.host,
          source: config.source || 'anchorpipe',
          sourcetype: config.sourcetype || 'anchorpipe:audit',
          index: config.index,
          event: log,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Splunk ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(splunkEvent),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          // Limit error message length to prevent potential information disclosure
          const truncatedError =
            errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
          return {
            success: false,
            error: `Splunk HEC ${response.status}: ${truncatedError}`,
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

      // Splunk HEC supports batch events
      try {
        const events = logs.map((log) => ({
          time: Math.floor(new Date(log.timestamp).getTime() / 1000),
          host: config.host,
          source: config.source || 'anchorpipe',
          sourcetype: config.sourcetype || 'anchorpipe:audit',
          index: config.index,
          event: log,
        }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Splunk ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: events.map((e) => JSON.stringify(e)).join('\n'),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          // Limit error message length to prevent potential information disclosure
          const truncatedError =
            errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
          // If batch fails, mark all as failed
          return {
            success: 0,
            failed: logs.length,
            errors: logs.map((log) => ({
              logId: log.id,
              error: `Splunk HEC ${response.status}: ${truncatedError}`,
            })),
          };
        }

        return {
          success: logs.length,
          failed: 0,
        };
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
        const testLog: SiemLogEntry = {
          id: 'test',
          timestamp: new Date().toISOString(),
          action: 'test',
          subject: 'system',
          description: 'Splunk connection test',
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
