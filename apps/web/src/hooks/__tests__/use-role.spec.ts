import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole, useHasRole, useIsOwner, useIsAdmin } from '@/hooks/use-role';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/use-auth';

const mockedUseAuth = useAuth as ReturnType<typeof vi.fn>;

function mockUser(role: string) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      role: 'USER',
      tenantId: 'tenant-1',
      avatarUrl: null,
      memberships: [{ tenantId: 'tenant-1', role }],
    },
  });
}

describe('useRole', () => {
  it('returns the role from the first membership', () => {
    mockUser('OWNER');
    const { result } = renderHook(() => useRole());
    expect(result.current).toBe('OWNER');
  });

  it('returns null when user is null', () => {
    mockedUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useRole());
    expect(result.current).toBeNull();
  });

  it('returns null when user has no memberships', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'test@test.com',
        memberships: [],
      },
    });
    const { result } = renderHook(() => useRole());
    expect(result.current).toBeNull();
  });

  it('returns null when memberships is undefined', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'test@test.com',
      },
    });
    const { result } = renderHook(() => useRole());
    expect(result.current).toBeNull();
  });
});

describe('useHasRole', () => {
  describe('with OWNER role', () => {
    it('returns true for minimum OWNER', () => {
      mockUser('OWNER');
      const { result } = renderHook(() => useHasRole('OWNER'));
      expect(result.current).toBe(true);
    });

    it('returns true for minimum ADMIN', () => {
      mockUser('OWNER');
      const { result } = renderHook(() => useHasRole('ADMIN'));
      expect(result.current).toBe(true);
    });

    it('returns true for minimum STAFF', () => {
      mockUser('OWNER');
      const { result } = renderHook(() => useHasRole('STAFF'));
      expect(result.current).toBe(true);
    });
  });

  describe('with ADMIN role', () => {
    it('returns false for minimum OWNER', () => {
      mockUser('ADMIN');
      const { result } = renderHook(() => useHasRole('OWNER'));
      expect(result.current).toBe(false);
    });

    it('returns true for minimum ADMIN', () => {
      mockUser('ADMIN');
      const { result } = renderHook(() => useHasRole('ADMIN'));
      expect(result.current).toBe(true);
    });

    it('returns true for minimum STAFF', () => {
      mockUser('ADMIN');
      const { result } = renderHook(() => useHasRole('STAFF'));
      expect(result.current).toBe(true);
    });
  });

  describe('with STAFF role', () => {
    it('returns false for minimum OWNER', () => {
      mockUser('STAFF');
      const { result } = renderHook(() => useHasRole('OWNER'));
      expect(result.current).toBe(false);
    });

    it('returns false for minimum ADMIN', () => {
      mockUser('STAFF');
      const { result } = renderHook(() => useHasRole('ADMIN'));
      expect(result.current).toBe(false);
    });

    it('returns true for minimum STAFF', () => {
      mockUser('STAFF');
      const { result } = renderHook(() => useHasRole('STAFF'));
      expect(result.current).toBe(true);
    });
  });

  it('returns false when user is null', () => {
    mockedUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useHasRole('STAFF'));
    expect(result.current).toBe(false);
  });

  it('returns false when user has no memberships', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@test.com', memberships: [] },
    });
    const { result } = renderHook(() => useHasRole('STAFF'));
    expect(result.current).toBe(false);
  });
});

describe('useIsOwner', () => {
  it('returns true for OWNER', () => {
    mockUser('OWNER');
    const { result } = renderHook(() => useIsOwner());
    expect(result.current).toBe(true);
  });

  it('returns false for ADMIN', () => {
    mockUser('ADMIN');
    const { result } = renderHook(() => useIsOwner());
    expect(result.current).toBe(false);
  });
});

describe('useIsAdmin', () => {
  it('returns true for ADMIN', () => {
    mockUser('ADMIN');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('returns true for OWNER', () => {
    mockUser('OWNER');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('returns false for STAFF', () => {
    mockUser('STAFF');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
