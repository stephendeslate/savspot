import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  isActive: boolean;
  pricingModel: string;
  guestConfig: Record<string, unknown> | null;
  depositConfig: Record<string, unknown> | null;
  intakeFormConfig: Record<string, unknown> | null;
}

export function useServices() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.services(tenantId ?? ''),
    queryFn: () =>
      apiClient.get<Service[]>(`/api/tenants/${tenantId}/services`),
    enabled: !!tenantId,
  });
}

export function useDeactivateService() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: (serviceId: string) =>
      apiClient.patch(`/api/tenants/${tenantId}/services/${serviceId}`, {
        isActive: false,
      }),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.services(tenantId),
        });
      }
    },
  });
}
