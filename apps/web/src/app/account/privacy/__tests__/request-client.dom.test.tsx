import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DsrClient from '../request-client';

const buildResponse = (overrides: Partial<Response> = {}) =>
  ({
    ok: true,
    json: async () => ({}),
    ...overrides,
  }) as Response;

describe('<DsrClient />', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders empty state when no requests exist', () => {
    render(<DsrClient initialRequests={[]} />);

    expect(screen.getByText('Privacy & Data Requests')).toBeInTheDocument();
    expect(screen.getByText('No requests submitted yet.')).toBeInTheDocument();
  });

  it('handles export success and refreshes requests', async () => {
    const nextRequests = [
      {
        id: 'req-1',
        type: 'export',
        status: 'completed',
        requestedAt: '2024-01-01T00:00:00.000Z',
        processedAt: '2024-01-02T00:00:00.000Z',
        dueAt: null,
        confirmationSentAt: null,
        metadata: null,
        events: [],
        exportAvailable: true,
      },
    ];

    const fetchMock = vi
      .fn()
      // Export request
      .mockResolvedValueOnce(buildResponse({ ok: true }))
      // Refresh request
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => nextRequests,
        })
      );
    global.fetch = fetchMock;

    render(<DsrClient initialRequests={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));

    await waitFor(() =>
      expect(screen.getByText('Data export generated. Download from the table below.')).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Download JSON')).toBeInTheDocument();
  });

  it('shows error when export fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildResponse({
          ok: false,
          json: async () => ({ error: 'Export failed' }),
        })
      );
    global.fetch = fetchMock;

    render(<DsrClient initialRequests={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));

    await waitFor(() => expect(screen.getByText('Export failed')).toBeInTheDocument());
  });

  it('submits deletion request with optional reason', async () => {
    const fetchMock = vi
      .fn()
      // deletion request
      .mockResolvedValueOnce(buildResponse({ ok: true }))
      // refresh
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [],
        })
      );
    global.fetch = fetchMock;

    render(<DsrClient initialRequests={[]} />);

    const textarea = screen.getByLabelText('Reason (optional)');
    fireEvent.change(textarea, { target: { value: 'testing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request deletion' }));

    await waitFor(() =>
      expect(
        screen.getByText('Deletion workflow completed. Sensitive data has been redacted.')
      ).toBeInTheDocument()
    );
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dsr/deletion',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'testing' }),
      })
    );
  });

  it('shows error when deletion fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildResponse({
          ok: false,
          json: async () => ({ error: 'Deletion request failed' }),
        })
      );
    global.fetch = fetchMock;

    render(<DsrClient initialRequests={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Request deletion' }));

    await waitFor(() => expect(screen.getByText('Deletion request failed')).toBeInTheDocument());
  });
});

