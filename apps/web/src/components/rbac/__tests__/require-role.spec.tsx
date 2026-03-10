import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireRole } from '../require-role';

vi.mock('@/hooks/use-role', () => ({
  useHasRole: vi.fn(),
}));

import { useHasRole } from '@/hooks/use-role';

const mockedUseHasRole = useHasRole as ReturnType<typeof vi.fn>;

describe('RequireRole', () => {
  it('renders children when user has sufficient role', () => {
    mockedUseHasRole.mockReturnValue(true);

    render(
      <RequireRole minimum="STAFF">
        <div data-testid="protected">Protected Content</div>
      </RequireRole>,
    );

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('renders nothing when user lacks required role', () => {
    mockedUseHasRole.mockReturnValue(false);

    const { container } = render(
      <RequireRole minimum="OWNER">
        <div data-testid="protected">Protected Content</div>
      </RequireRole>,
    );

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback when user lacks required role and fallback is provided', () => {
    mockedUseHasRole.mockReturnValue(false);

    render(
      <RequireRole
        minimum="ADMIN"
        fallback={<div data-testid="fallback">No access</div>}
      >
        <div data-testid="protected">Protected Content</div>
      </RequireRole>,
    );

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('passes the correct minimum role to useHasRole', () => {
    mockedUseHasRole.mockReturnValue(true);

    render(
      <RequireRole minimum="ADMIN">
        <div>Content</div>
      </RequireRole>,
    );

    expect(mockedUseHasRole).toHaveBeenCalledWith('ADMIN');
  });

  it('renders children for OWNER when minimum is STAFF', () => {
    mockedUseHasRole.mockReturnValue(true);

    render(
      <RequireRole minimum="STAFF">
        <div data-testid="content">Visible</div>
      </RequireRole>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children for ADMIN when minimum is ADMIN', () => {
    mockedUseHasRole.mockReturnValue(true);

    render(
      <RequireRole minimum="ADMIN">
        <div data-testid="content">Admin Content</div>
      </RequireRole>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
