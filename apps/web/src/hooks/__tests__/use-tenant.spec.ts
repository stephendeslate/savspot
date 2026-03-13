import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenant } from '@/hooks/use-tenant';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/use-auth';

const mockedUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('useTenant', () => {
  it('returns activeTenantId when user is loaded', () => {
    mockedUseAuth.mockReturnValue({
      activeTenantId: 'tenant-123',
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBe('tenant-123');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null tenantId when activeTenantId is null', () => {
    mockedUseAuth.mockReturnValue({
      activeTenantId: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null tenantId and isLoading true when user is null', () => {
    mockedUseAuth.mockReturnValue({ activeTenantId: null, isLoading: true });

    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading false when user object exists', () => {
    mockedUseAuth.mockReturnValue({
      activeTenantId: 'tenant-1',
      isLoading: false,
    });

    const { result } = renderHook(() => useTenant());

    expect(result.current.isLoading).toBe(false);
  });
});
