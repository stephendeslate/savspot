'use client';

import { useAuth } from './use-auth';
import { useMemo } from 'react';

export function useTenant() {
  const { activeTenantId, isLoading: isAuthLoading } = useAuth();
  return useMemo(
    () => ({
      tenantId: activeTenantId,
      isLoading: isAuthLoading,
    }),
    [activeTenantId, isAuthLoading],
  );
}
