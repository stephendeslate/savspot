'use client';

import { useAuth } from './use-auth';
import { useMemo } from 'react';

export function useTenant() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useMemo(
    () => ({
      tenantId: user?.tenantId ?? null,
      isLoading: isAuthLoading,
    }),
    [user, isAuthLoading],
  );
}
