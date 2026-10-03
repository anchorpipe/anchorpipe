import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GET } from '../route';

const mockCreateMinioClient = vi.hoisted(() => vi.fn());
const mockCheckMinioHealth = vi.hoisted(() => vi.fn());

vi.mock('@anchorpipe/storage', () => ({
  createMinioClient: mockCreateMinioClient,
  checkMinioHealth: mockCheckMinioHealth,
}));

describe('/api/health/storage GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMinioClient.mockReturnValue({ client: true });
    mockCheckMinioHealth.mockResolvedValue(true);
    process.env.MINIO_ENDPOINT = 'minio.local';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_ACCESS_KEY = 'user';
    process.env.MINIO_SECRET_KEY = 'pass';
  });

  it('returns ok when storage is healthy', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockCreateMinioClient).toHaveBeenCalledWith({
      endPoint: 'minio.local',
      port: 9000,
      useSSL: false,
      accessKey: 'user',
      secretKey: 'pass',
    });
    expect(mockCheckMinioHealth).toHaveBeenCalledWith({ client: true });
  });

  it('returns 503 when health check fails', async () => {
    mockCheckMinioHealth.mockResolvedValueOnce(false);

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('returns 503 when creation throws', async () => {
    mockCreateMinioClient.mockImplementationOnce(() => {
      throw new Error('down');
    });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
