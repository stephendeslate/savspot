'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Role hierarchy: OWNER > ADMIN > STAFF.
 * Higher index = higher privilege.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  STAFF: 0,
  ADMIN: 1,
  OWNER: 2,
};

/**
 * Returns the current user's role for the active tenant.
 * If activeTenantId is set but doesn't match any membership, returns null (no permissions).
 * Only falls back to the first membership when there is no activeTenantId.
 */
export function useRole(): string | null {
  const { user, activeTenantId } = useAuth();

  return useMemo(() => {
    if (!user?.memberships?.length) return null;

    if (activeTenantId) {
      const match = user.memberships.find((m) => m.tenantId === activeTenantId);
      return match?.role ?? null;
    }

    return user.memberships[0]?.role ?? null;
  }, [user?.memberships, activeTenantId]);
}

/**
 * Returns true if the current user's role meets or exceeds the given minimum.
 */
export function useHasRole(minimum: 'STAFF' | 'ADMIN' | 'OWNER'): boolean {
  const role = useRole();
  return useMemo(() => {
    if (!role) return false;
    const userLevel = ROLE_HIERARCHY[role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minimum] ?? Infinity;
    return userLevel >= requiredLevel;
  }, [role, minimum]);
}

/** Returns true if the current user is an OWNER. */
export function useIsOwner(): boolean {
  return useHasRole('OWNER');
}

/** Returns true if the current user is at least an ADMIN. */
export function useIsAdmin(): boolean {
  return useHasRole('ADMIN');
}
