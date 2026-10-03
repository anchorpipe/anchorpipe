import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { GET } from '../route';

const mockConnectRabbit = vi.hoisted(() => vi.fn());

vi.mock('@anchorpipe/mq', () => ({
  connectRabbit: mockConnectRabbit,
}));

describe('/api/health/mq GET', () => {
  const originalUrl = process.env.RABBITMQ_URL;

  beforeEach(() => {
    mockConnectRabbit.mockReset();
    process.env.RABBITMQ_URL = 'amqp://localhost';
  });

  afterEach(() => {
    process.env.RABBITMQ_URL = originalUrl;
  });

  it('returns 503 when the URL is missing', async () => {
    process.env.RABBITMQ_URL = '';

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: 'missing_url' });
  });

  it('returns ok when connection succeeds', async () => {
    const close = vi.fn();
    mockConnectRabbit.mockResolvedValue({ channel: { close } });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(close).toHaveBeenCalled();
  });

  it('returns 503 when connection fails', async () => {
    mockConnectRabbit.mockRejectedValue(new Error('down'));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'connect_failed' });
  });
});
