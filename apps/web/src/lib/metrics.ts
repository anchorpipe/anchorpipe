import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route', 'method', 'status'] as const,
  buckets: [50, 100, 200, 300, 500, 1000, 2000],
});

register.registerMetric(httpRequestDurationMs);

export async function metricsText(): Promise<string> {
  return await register.metrics();
}

export { register };

