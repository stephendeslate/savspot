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
  const qk = queryKeys.services(tenantId ?? '');
  return useMutation({
    mutationFn: (serviceId: string) =>
      apiClient.patch(`/api/tenants/${tenantId}/services/${serviceId}`, {
        isActive: false,
      }),
    onMutate: async (serviceId) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<Service[]>(qk);
      queryClient.setQueryData<Service[]>(qk, (old) =>
        old?.map((s) => (s.id === serviceId ? { ...s, isActive: false } : s)),
      );
      return { previous };
    },
    onError: (_err, _serviceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
    },
    onSettled: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: qk });
      }
    },
  });
}
