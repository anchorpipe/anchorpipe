import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordTelemetry, isTelemetryEnabled } from '../telemetry';

describe('telemetry', () => {
  const originalConsole = console.log;
  const mockConsoleLog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsole;
    vi.unstubAllEnvs();
  });

  describe('recordTelemetry', () => {
    it('does nothing when telemetry is disabled', async () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'false');

      await recordTelemetry({ eventType: 'test' });

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('logs telemetry event when enabled', async () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'true');

      await recordTelemetry({
        eventType: 'user.action',
        properties: { action: 'click' },
        requestId: 'req-1',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[telemetry]')
      );
      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('user.action');
      expect(logCall).toContain('req-1');
    });

    it('uses current timestamp when not provided', async () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'true');
      const before = Date.now();

      await recordTelemetry({ eventType: 'test' });

      const after = Date.now();
      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall.replace('[telemetry] ', ''));
      expect(parsed.timestampMs).toBeGreaterThanOrEqual(before);
      expect(parsed.timestampMs).toBeLessThanOrEqual(after);
    });
  });

  describe('isTelemetryEnabled', () => {
    it('returns false when TELEMETRY_ENABLED is not set', () => {
      vi.unstubAllEnvs();
      delete process.env.TELEMETRY_ENABLED;

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('returns true when TELEMETRY_ENABLED is "true"', () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'true');

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('returns false when TELEMETRY_ENABLED is "false"', () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'false');

      expect(isTelemetryEnabled()).toBe(false);
    });
  });
});

