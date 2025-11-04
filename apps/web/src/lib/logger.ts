type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function format(message: string, meta?: Record<string, unknown>) {
  return meta ? `${message} ${JSON.stringify(meta)}` : message;
}

export const logger = {
  level,
  fatal(message: string, meta?: Record<string, unknown>) {
    if (should('fatal')) console.error(format(message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (should('error')) console.error(format(message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (should('warn')) console.warn(format(message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (should('info')) console.log(format(message, meta));
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (should('debug')) console.debug(format(message, meta));
  },
  trace(message: string, meta?: Record<string, unknown>) {
    if (should('trace')) console.debug(format(message, meta));
  },
};

const ranks: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
  silent: 1000,
};

function should(l: LogLevel) {
  return ranks[l] >= ranks[level];
}

export function nowMs() {
  return Date.now();
}

export function durationMs(start: number) {
  return Date.now() - start;
}
