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

export function useBookings(params: Record<string, string> = {}) {
  const { tenantId } = useTenant();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: queryKeys.bookings(tenantId ?? '', params),
    queryFn: () =>
      apiClient.getRaw<PaginatedResponse<unknown>>(
        `/api/tenants/${tenantId}/bookings${searchParams ? `?${searchParams}` : ''}`,
      ),
    enabled: !!tenantId,
  });
}

export function useCalendarEvents(startDate: string, endDate: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.calendarEvents(tenantId ?? '', startDate, endDate),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      params.set('limit', '500');
      return apiClient.getRaw<PaginatedResponse<unknown>>(
        `/api/tenants/${tenantId}/bookings?${params.toString()}`,
      );
    },
    enabled: !!tenantId && !!startDate && !!endDate,
    staleTime: 60_000,
  });
}
