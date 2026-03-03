'use client';

import { useAuth } from './use-auth';
import { useMemo } from 'react';

export function useTenant() {
  const { user } = useAuth();
  // For now, extract tenantId from user context
  // In production, this would come from URL or session
  return useMemo(
    () => ({
      tenantId: user?.tenantId ?? null,
      isLoading: !user,
    }),
    [user],
  );
}
