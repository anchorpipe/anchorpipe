import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';

const mockUseSearchParams = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useSearchParams: mockUseSearchParams,
}));

describe('<LoginPage />', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    global.fetch = vi.fn();
  });

  it('surfaces OAuth errors from query parameters', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('error=oauth&message=OAuth%20failed'));

    render(<LoginPage />);

    expect(screen.getByText('Error: OAuth failed')).toBeInTheDocument();
  });

  it('shows an error message when credential login fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});


