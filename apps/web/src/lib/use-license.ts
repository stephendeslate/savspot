'use client';

import { useEffect, useState } from 'react';
import { apiClient } from './api-client';

interface LicenseStatus {
  licensed: boolean;
  loading: boolean;
}

/**
 * Hook to check if the current tenant has an active EE license.
 * Returns { licensed, loading } — use `licensed` to gate EE features
 * in the dashboard and show <UpgradeBanner> when unlicensed.
 */
export function useLicense(): LicenseStatus {
  const [licensed, setLicensed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ licensed: boolean }>('/tenants/me/license')
      .then((res) => setLicensed(res.licensed))
      .catch(() => setLicensed(false))
      .finally(() => setLoading(false));
  }, []);

  return { licensed, loading };
}
