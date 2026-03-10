'use client';

import { type ReactNode } from 'react';
import { useHasRole } from '@/hooks/use-role';

interface RequireRoleProps {
  /** Minimum role required to render children. */
  minimum: 'STAFF' | 'ADMIN' | 'OWNER';
  /** Content to render when the user has sufficient permissions. */
  children: ReactNode;
  /** Optional content to render when the user lacks permissions. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user has a role at or above the given minimum.
 * Otherwise renders the optional fallback (defaults to null).
 */
export function RequireRole({ minimum, children, fallback = null }: RequireRoleProps) {
  const hasRole = useHasRole(minimum);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
