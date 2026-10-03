import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RepoRolesPage from '../page';

const mockUseParams = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

describe('<RepoRolesPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ repoId: 'repo-123' });
    global.fetch = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            {
              id: 'role-1',
              userId: 'user-1',
              repoId: 'repo-123',
              role: 'admin',
              user: {
                email: 'admin@example.com',
                name: 'Admin',
                githubLogin: 'admin',
                id: 'user-1',
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logs: [
            {
              id: 'log-1',
              action: 'role.assigned',
              oldRole: null,
              newRole: 'admin',
              actor: { email: 'owner@example.com' },
              targetUser: { email: 'admin@example.com' },
              createdAt: '2025-01-01T00:00:00.000Z',
            },
          ],
        }),
      });
    window.confirm = vi.fn().mockReturnValue(true);
  });

  it('renders users and audit logs after loading', async () => {
    render(<RepoRolesPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    expect(await screen.findByText('Repository Roles')).toBeInTheDocument();
    expect(screen.getByText('Users with Roles (1)')).toBeInTheDocument();
    expect(screen.getAllByText('admin@example.com')).toHaveLength(2);
    expect(screen.getByText('Audit Logs (1)')).toBeInTheDocument();
    expect(screen.getByText('role.assigned')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ logs: [] }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RepoRolesPage />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('disables assign button until user id entered', async () => {
    render(<RepoRolesPage />);

    await screen.findByText('Users with Roles (1)');

    const button = screen.getByRole('button', { name: 'Assign Role' });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'user-9' } });
    expect(button).not.toBeDisabled();
  });
});
