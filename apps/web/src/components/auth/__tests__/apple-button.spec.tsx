import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppleButton } from '../apple-button';

describe('AppleButton', () => {
  it('should render with default label', () => {
    render(<AppleButton />);
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(<AppleButton label="Sign up with Apple" />);
    expect(screen.getByText('Sign up with Apple')).toBeInTheDocument();
  });

  it('should link to the Apple auth endpoint', () => {
    render(<AppleButton />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      'http://localhost:3001/api/auth/apple',
    );
  });

  it('should render an Apple SVG icon', () => {
    render(<AppleButton />);
    const link = screen.getByRole('link');
    const svg = link.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
