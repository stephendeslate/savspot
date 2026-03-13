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
 * Returns the current user's tenant role from the active membership.
 */
export function useRole(): string | null {
  const { user, activeTenantId } = useAuth();
  const membership = user?.memberships?.find((m) => m.tenantId === activeTenantId)
    ?? user?.memberships?.[0];
  return membership?.role ?? null;
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
