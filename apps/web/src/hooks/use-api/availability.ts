import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

export function useAvailabilityRules() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.availabilityRules(tenantId ?? ''),
    queryFn: () =>
      apiClient.get<{ id: string }[]>(
        `/api/tenants/${tenantId}/availability-rules`,
      ),
    enabled: !!tenantId,
  });
}
