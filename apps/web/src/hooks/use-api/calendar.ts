import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

export function useCalendarConnections() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.calendarConnections(tenantId ?? ''),
    queryFn: () =>
      apiClient.get<{ id: string }[]>(
        `/api/tenants/${tenantId}/calendar/connections`,
      ),
    enabled: !!tenantId,
    staleTime: 600_000,
  });
}
