import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home page', () => {
  it('renders welcome messaging', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: /welcome to anchorpipe/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Flaky test management platform - Development in progress/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Status: Foundation \(Gate G0\)/i)).toBeInTheDocument();
  });
});
