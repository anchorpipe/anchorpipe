import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrivacyPage from '../page';

const mockRedirect = vi.hoisted(() => vi.fn(() => { throw new Error('redirect'); }));
const mockReadSession = vi.hoisted(() => vi.fn());
const mockListRequests = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/dsr-service', () => ({
  listDataSubjectRequests: mockListRequests,
}));

vi.mock('../request-client', () => ({
  default: (props: unknown) => props,
}));

describe('/account/privacy page (server)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when no session is present', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    await expect(PrivacyPage()).rejects.toThrow('redirect');

    expect(mockRedirect).toHaveBeenCalledWith('/login?from=/account/privacy');
    expect(mockListRequests).not.toHaveBeenCalled();
  });

  it('serializes requests and renders client component', async () => {
    mockReadSession.mockResolvedValueOnce({ sub: 'user-123' });
    mockListRequests.mockResolvedValueOnce([
      {
        id: 'req-1',
        type: 'export',
        status: 'completed',
        requestedAt: new Date('2024-01-01T00:00:00.000Z'),
        processedAt: new Date('2024-01-02T00:00:00.000Z'),
        dueAt: null,
        confirmationSentAt: null,
        metadata: { source: 'portal' },
        exportData: { size: 12 },
        events: [
          {
            id: 'evt-1',
            status: 'completed',
            message: null,
            createdAt: new Date('2024-01-02T00:00:00.000Z'),
          },
        ],
      },
    ]);

    const ui = (await PrivacyPage()) as { props: { initialRequests: unknown[] } };

    expect(mockListRequests).toHaveBeenCalledWith('user-123');
    expect(ui.props.initialRequests).toEqual([
      {
        id: 'req-1',
        type: 'export',
        status: 'completed',
        requestedAt: '2024-01-01T00:00:00.000Z',
        processedAt: '2024-01-02T00:00:00.000Z',
        dueAt: null,
        confirmationSentAt: null,
        metadata: { source: 'portal' },
        events: [
          {
            id: 'evt-1',
            status: 'completed',
            message: null,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        exportAvailable: true,
      },
    ]);
  });
});

