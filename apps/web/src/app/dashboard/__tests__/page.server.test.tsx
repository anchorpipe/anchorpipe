import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DashboardPage, { getMe } from '../page';
import { renderToStaticMarkup } from 'react-dom/server';

describe('/dashboard page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getMe returns parsed user when request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'user@example.com' }),
    } as Response);
    global.fetch = fetchMock;

    const result = await getMe();

    expect(result).toEqual({ email: 'user@example.com' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
  });

  it('getMe returns null when request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false } as Response);
    global.fetch = fetchMock;

    const result = await getMe();

    expect(result).toBeNull();
  });

  it('renders dashboard UI with fetched data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'user-1', email: 'user@example.com' }),
    } as Response);
    global.fetch = fetchMock;

    const ui = await DashboardPage();
    const markup = renderToStaticMarkup(ui);

    expect(markup).toContain('Dashboard');
    expect(markup).toContain('user@example.com');
    expect(markup).toContain('Sign out');
  });
});
