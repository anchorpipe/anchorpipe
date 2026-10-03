import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('telemetry', () => {
  const originalConsole = console.log;
  const mockConsoleLog = vi.fn();
  let recordTelemetry: (event: {
    eventType: string;
    properties?: Record<string, unknown>;
    requestId?: string;
    timestampMs?: number;
  }) => Promise<void>;
  let isTelemetryEnabled: () => boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    // Reload module to pick up new env vars
    vi.resetModules();
    vi.stubEnv('TELEMETRY_ENABLED', 'true');
    const telemetry = await import('../telemetry');
    recordTelemetry = telemetry.recordTelemetry;
    isTelemetryEnabled = telemetry.isTelemetryEnabled;
  });

  afterEach(() => {
    console.log = originalConsole;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('recordTelemetry', () => {
    it('does nothing when telemetry is disabled', async () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'false');
      vi.resetModules();
      const telemetry = await import('../telemetry');
      await telemetry.recordTelemetry({ eventType: 'test' });

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('logs telemetry event when enabled', async () => {
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
      const before = Date.now();

      await recordTelemetry({ eventType: 'test' });

      const after = Date.now();
      expect(mockConsoleLog).toHaveBeenCalled();
      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall.replace('[telemetry] ', ''));
      expect(parsed.timestampMs).toBeGreaterThanOrEqual(before);
      expect(parsed.timestampMs).toBeLessThanOrEqual(after);
    });
  });

  describe('isTelemetryEnabled', () => {
    it('returns false when TELEMETRY_ENABLED is not set', async () => {
      vi.unstubAllEnvs();
      delete process.env.TELEMETRY_ENABLED;
      vi.resetModules();
      const telemetry = await import('../telemetry');

      expect(telemetry.isTelemetryEnabled()).toBe(false);
    });

    it('returns true when TELEMETRY_ENABLED is "true"', () => {
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('returns false when TELEMETRY_ENABLED is "false"', async () => {
      vi.stubEnv('TELEMETRY_ENABLED', 'false');
      vi.resetModules();
      const telemetry = await import('../telemetry');

      expect(telemetry.isTelemetryEnabled()).toBe(false);
    });
  });
});

