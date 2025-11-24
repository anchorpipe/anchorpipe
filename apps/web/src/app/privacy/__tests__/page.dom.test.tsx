import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import PrivacyPage from '../page';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

describe('<PrivacyPage />', () => {
  it('lists user rights and contact info', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your Rights/i })).toBeInTheDocument();
    expect(screen.getByText('Access your personal data')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Account Privacy Settings/i })).toHaveAttribute(
      'href',
      '/account/privacy'
    );
    expect(screen.getAllByText(/privacy@anchorpipe\.dev/)).toHaveLength(2);
  });
});
