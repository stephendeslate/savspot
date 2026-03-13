import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenant } from '@/hooks/use-tenant';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/use-auth';

const mockedUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('useTenant', () => {
  it('returns tenantId from user when user is loaded', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'u1', tenantId: 'tenant-123', email: 'test@test.com' },
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBe('tenant-123');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null tenantId when user has no tenantId', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'u1', tenantId: null, email: 'test@test.com' },
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null tenantId and isLoading true when user is null', () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading false when user object exists', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'u1', tenantId: 'tenant-1' },
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.isLoading).toBe(false);
  });
});
