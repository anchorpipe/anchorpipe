'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface UserRole {
  id: string;
  userId: string;
  repoId: string;
  role: 'admin' | 'member' | 'read_only';
  user: {
    id: string;
    email: string | null;
    name: string | null;
    githubLogin: string | null;
  };
}

interface AuditLog {
  id: string;
  action: string;
  oldRole: string | null;
  newRole: string | null;
  actor: {
    email: string | null;
  };
  targetUser: {
    email: string | null;
  };
  createdAt: string;
}

export default function RepoRolesPage() {
  const params = useParams();
  const repoId = params.repoId as string;

  const [users, setUsers] = useState<UserRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'read_only'>('member');

  useEffect(() => {
    loadData();
  }, [repoId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, logsRes] = await Promise.all([
        fetch(`/api/repos/${repoId}/roles`),
        fetch(`/api/repos/${repoId}/roles/audit`),
      ]);

      if (!usersRes.ok || !logsRes.ok) {
        throw new Error('Failed to load data');
      }

      const usersData = await usersRes.json();
      const logsData = await logsRes.json();

      setUsers(usersData.users || []);
      setAuditLogs(logsData.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole() {
    if (!selectedUserId || !selectedRole) return;

    try {
      const res = await fetch(`/api/repos/${repoId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign role');
      }

      // Reload data
      await loadData();
      setSelectedUserId('');
      setSelectedRole('member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    }
  }

  async function handleRemoveRole(userId: string) {
    if (!confirm('Are you sure you want to remove this role?')) return;

    try {
      const res = await fetch(`/api/repos/${repoId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove role');
      }

      // Reload data
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Repository Roles</h1>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      <section style={{ marginBottom: '3rem' }}>
        <h2>Assign Role</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="userId" style={{ display: 'block', marginBottom: '0.5rem' }}>
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Enter user UUID"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="role" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Role
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="read_only">Read Only</option>
            </select>
          </div>
          <button
            onClick={handleAssignRole}
            disabled={!selectedUserId}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedUserId ? 'pointer' : 'not-allowed',
              opacity: selectedUserId ? 1 : 0.5,
            }}
          >
            Assign Role
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Users with Roles ({users.length})</h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #ddd',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                User
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                Role
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>
                  No users with roles yet
                </td>
              </tr>
            ) : (
              users.map((userRole) => (
                <tr key={userRole.id}>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {userRole.user.email || userRole.user.githubLogin || userRole.userId}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          userRole.role === 'admin'
                            ? '#d4edda'
                            : userRole.role === 'member'
                              ? '#d1ecf1'
                              : '#f8d7da',
                        color:
                          userRole.role === 'admin'
                            ? '#155724'
                            : userRole.role === 'member'
                              ? '#0c5460'
                              : '#721c24',
                      }}
                    >
                      {userRole.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => handleRemoveRole(userRole.userId)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Audit Logs ({auditLogs.length})</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
          {auditLogs.length === 0 ? (
            <p style={{ padding: '1rem', textAlign: 'center' }}>No audit logs yet</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                    Action
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                    Actor
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                    Target
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                    Change
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{log.action}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {log.actor.email || 'Unknown'}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {log.targetUser.email || 'Unknown'}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {log.oldRole || 'none'} → {log.newRole || 'none'}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

