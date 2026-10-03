import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import DpaPage from '../page';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

describe('<DpaPage />', () => {
  it('renders key sections and related documents', () => {
    render(<DpaPage />);

    expect(screen.getByRole('heading', { name: /data processing agreement/i })).toBeInTheDocument();
    expect(screen.getByText(/Last Updated/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scope' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Key Provisions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Full Agreement' })).toBeInTheDocument();
    const relatedDocs = screen.getByRole('heading', { name: /Related Documentation/ });
    const list = relatedDocs.nextElementSibling as HTMLElement;
    expect(within(list).getByText('Privacy Policy')).toBeInTheDocument();
  });
});
