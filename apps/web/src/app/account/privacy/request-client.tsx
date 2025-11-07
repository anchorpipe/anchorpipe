'use client';

// cspell:ignore anchorpipe

import { useState } from 'react';

type SerializedRequest = {
  id: string;
  type: string;
  status: string;
  requestedAt: string | Date | null;
  processedAt: string | Date | null;
  dueAt: string | Date | null;
  confirmationSentAt: string | Date | null;
  metadata: Record<string, unknown> | null;
  events: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: string | Date | null;
  }>;
  exportAvailable: boolean;
};

interface Props {
  initialRequests: SerializedRequest[];
}

function formatDate(value: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};

export default function DsrClient({ initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<'export' | 'deletion' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const refresh = async () => {
    const res = await fetch('/api/dsr', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to refresh DSR requests');
    }
    const data = (await res.json()) as SerializedRequest[];
    setRequests(data);
  };

  const handleExport = async () => {
    try {
      setLoading('export');
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/dsr/export', {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Export failed');
      }
      await refresh();
      setSuccess('Data export generated. Download from the table below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(null);
    }
  };

  const handleDeletion = async () => {
    try {
      setLoading('deletion');
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/dsr/deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Deletion request failed');
      }
      setReason('');
      setSuccess('Deletion workflow completed. Sensitive data has been redacted.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Privacy &amp; Data Requests</h1>
        <p className="text-sm text-muted-foreground">
          Export a copy of your anchorpipe data or request account deletion. All requests are
          tracked for compliance with privacy regulations.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Request an export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generates a downloadable JSON file containing your account details, repository
          permissions, and recent audit log activity. A confirmation email will be queued
          automatically.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/70"
          onClick={handleExport}
          disabled={loading === 'export'}
        >
          {loading === 'export' ? 'Generating export…' : 'Generate export'}
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Request account deletion</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Removes personal data (name, email, GitHub login) and revokes repository access. A
          compliance record is retained to document the request.
        </p>

        <label className="mt-4 block text-sm font-medium" htmlFor="deletion-reason">
          Reason (optional)
        </label>
        <textarea
          id="deletion-reason"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Let us know why you are leaving (optional)"
        />

        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:bg-destructive/70"
          onClick={handleDeletion}
          disabled={loading === 'deletion'}
        >
          {loading === 'deletion' ? 'Processing deletion…' : 'Request deletion'}
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Request history</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No requests submitted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Requested</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Processed</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium capitalize">{request.type}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusBadge[request.status] ?? 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {formatDate(request.requestedAt)}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {formatDate(request.dueAt)}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {formatDate(request.processedAt)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {request.type === 'export' && request.exportAvailable ? (
                        <a
                          href={`/api/dsr/export/${request.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Download JSON
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {requests.length > 0 && (
          <details className="mt-4 rounded-md border bg-muted/40 p-4 text-sm">
            <summary className="cursor-pointer font-medium">View latest events</summary>
            <ul className="mt-3 space-y-2">
              {requests.map((request) =>
                request.events.slice(0, 3).map((event) => (
                  <li key={`${request.id}-${event.id}`}>
                    <span className="font-semibold">[{request.type}]</span>{' '}
                    {event.message ?? event.status} –{' '}
                    <span className="text-muted-foreground">{formatDate(event.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
