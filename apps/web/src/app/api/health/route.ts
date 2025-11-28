import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SERVICE_ENDPOINTS = [
  { key: 'db', path: '/api/health/db' },
  { key: 'mq', path: '/api/health/mq' },
  { key: 'storage', path: '/api/health/storage' },
] as const;

async function checkService(path: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.INTERNAL_SELF_BASE_URL || 'http://localhost:3000'}${path}`,
      {
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return false;
    }

    const json = await res.json();
    if (typeof json?.ok === 'boolean') {
      return json.ok;
    }

    return json?.status === 'healthy';
  } catch {
    return false;
  }
}

export async function GET() {
  const checks = await Promise.all(
    SERVICE_ENDPOINTS.map(async (service) => ({
      key: service.key,
      ok: await checkService(service.path),
    }))
  );

  const services = checks.reduce<Record<string, { ok: boolean }>>((acc, item) => {
    acc[item.key] = { ok: item.ok };
    return acc;
  }, {});

  const ok = checks.every((service) => service.ok);

  return NextResponse.json(
    {
      ok,
      services,
    },
    { status: ok ? 200 : 503 }
  );
}

