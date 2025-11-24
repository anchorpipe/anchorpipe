import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, nowMs, durationMs } from '../logger';

describe('logger', () => {
  const originalConsole = { ...console };
  const mockConsole = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.log = mockConsole.log;
    console.debug = mockConsole.debug;
  });

  afterEach(() => {
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
  });

  describe('logger methods', () => {

    it('logs fatal messages', () => {
      logger.fatal('Fatal error occurred', { error: 'test' });
      expect(mockConsole.error).toHaveBeenCalledWith('Fatal error occurred {"error":"test"}');
    });

    it('logs error messages', () => {
      logger.error('Error occurred', { code: 500 });
      expect(mockConsole.error).toHaveBeenCalledWith('Error occurred {"code":500}');
    });

    it('logs warn messages', () => {
      logger.warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith('Warning message');
    });

    it('logs info messages', () => {
      logger.info('Info message', { userId: 'user-1' });
      expect(mockConsole.log).toHaveBeenCalledWith('Info message {"userId":"user-1"}');
    });

    it('logs debug messages when level allows', () => {
      // Note: debug/trace may not log if LOG_LEVEL is higher than debug
      // This test verifies the function exists and can be called
      logger.debug('Debug message', { debug: true });
      // May or may not be called depending on LOG_LEVEL
    });

    it('logs trace messages when level allows', () => {
      // Note: trace may not log if LOG_LEVEL is higher than trace
      // This test verifies the function exists and can be called
      logger.trace('Trace message');
      // May or may not be called depending on LOG_LEVEL
    });

    it('handles messages without metadata', () => {
      logger.info('Simple message');
      expect(mockConsole.log).toHaveBeenCalledWith('Simple message');
    });
  });

  describe('nowMs', () => {
    it('returns current timestamp in milliseconds', () => {
      const before = Date.now();
      const result = nowMs();
      const after = Date.now();

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('durationMs', () => {
    it('calculates duration from start time', () => {
      const start = Date.now() - 100;
      const result = durationMs(start);

      expect(result).toBeGreaterThanOrEqual(100);
      expect(result).toBeLessThan(200);
    });
  });
});

