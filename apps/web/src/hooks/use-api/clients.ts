import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useClients(params: Record<string, string> = {}) {
  const { tenantId } = useTenant();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: queryKeys.clients(tenantId ?? '', params),
    queryFn: () =>
      apiClient.getRaw<PaginatedResponse<unknown>>(
        `/api/tenants/${tenantId}/clients${searchParams ? `?${searchParams}` : ''}`,
      ),
    enabled: !!tenantId,
  });
}
