import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

export function useStripeStatus() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.stripeStatus(tenantId ?? ''),
    queryFn: () =>
      apiClient.get<{ connected: boolean }>(
        `/api/tenants/${tenantId}/payments/connect/status`,
      ),
    enabled: !!tenantId,
    staleTime: 600_000,
  });
}

export function usePaymentStats() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.paymentStats(tenantId ?? ''),
    queryFn: () =>
      apiClient.get<{ totalRevenue: number; currency: string }>(
        `/api/tenants/${tenantId}/payments/stats`,
      ),
    enabled: !!tenantId,
  });
}
