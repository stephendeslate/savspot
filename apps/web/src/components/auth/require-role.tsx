'use client';

import { type ReactNode } from 'react';
import { useHasRole } from '@/hooks/use-role';
import { AccessDenied } from './access-denied';

interface RequireRoleProps {
  minimum: 'STAFF' | 'ADMIN' | 'OWNER';
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ minimum, children, fallback }: RequireRoleProps) {
  const hasRole = useHasRole(minimum);

  if (!hasRole) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}
