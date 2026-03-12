import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from './use-tenant';

// ----- Query Key Factory -----
export const queryKeys = {
  services: (tenantId: string) => ['services', tenantId] as const,
  bookings: (tenantId: string, params?: Record<string, string>) =>
    ['bookings', tenantId, params] as const,
  clients: (tenantId: string, params?: Record<string, string>) =>
    ['clients', tenantId, params] as const,
  dashboardStats: (tenantId: string) => ['dashboard-stats', tenantId] as const,
  notifications: (tenantId: string) => ['notifications', tenantId] as const,
  unreadCount: (tenantId: string) => ['unread-count', tenantId] as const,
  calendarEvents: (tenantId: string, start: string, end: string) =>
    ['calendar-events', tenantId, start, end] as const,
  availabilityRules: (tenantId: string) =>
    ['availability-rules', tenantId] as const,
  stripeStatus: (tenantId: string) => ['stripe-status', tenantId] as const,
  calendarConnections: (tenantId: string) =>
    ['calendar-connections', tenantId] as const,
  paymentStats: (tenantId: string) => ['payment-stats', tenantId] as const,
};

// ----- Types -----

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

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// ----- Hooks -----

export function useServices() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.services(tenantId!),
    queryFn: () =>
      apiClient.get<Service[]>(`/api/tenants/${tenantId}/services`),
    enabled: !!tenantId,
  });
}

export function useBookings(params: Record<string, string> = {}) {
  const { tenantId } = useTenant();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: queryKeys.bookings(tenantId!, params),
    queryFn: () =>
      apiClient.getRaw<PaginatedResponse<unknown>>(
        `/api/tenants/${tenantId}/bookings${searchParams ? `?${searchParams}` : ''}`,
      ),
    enabled: !!tenantId,
  });
}

export function useClients(params: Record<string, string> = {}) {
  const { tenantId } = useTenant();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: queryKeys.clients(tenantId!, params),
    queryFn: () =>
      apiClient.getRaw<PaginatedResponse<unknown>>(
        `/api/tenants/${tenantId}/clients${searchParams ? `?${searchParams}` : ''}`,
      ),
    enabled: !!tenantId,
  });
}

export function useCalendarEvents(startDate: string, endDate: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.calendarEvents(tenantId!, startDate, endDate),
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

export function useNotifications(limit = 10) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.notifications(tenantId!),
    queryFn: () =>
      apiClient.get<Notification[]>(
        `/api/tenants/${tenantId}/notifications?limit=${limit}`,
      ),
    enabled: !!tenantId,
  });
}

export function useUnreadCount() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.unreadCount(tenantId!),
    queryFn: () =>
      apiClient.get<{ count: number }>(
        `/api/tenants/${tenantId}/notifications/unread-count`,
      ),
    enabled: !!tenantId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(
        `/api/tenants/${tenantId}/notifications/${notificationId}/read`,
      ),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(tenantId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.unreadCount(tenantId),
        });
      }
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: () =>
      apiClient.post(`/api/tenants/${tenantId}/notifications/read-all`),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(tenantId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.unreadCount(tenantId),
        });
      }
    },
  });
}

export function useAvailabilityRules() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.availabilityRules(tenantId!),
    queryFn: () =>
      apiClient.get<{ id: string }[]>(
        `/api/tenants/${tenantId}/availability-rules`,
      ),
    enabled: !!tenantId,
  });
}

export function useStripeStatus() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.stripeStatus(tenantId!),
    queryFn: () =>
      apiClient.get<{ connected: boolean }>(
        `/api/tenants/${tenantId}/payments/connect/status`,
      ),
    enabled: !!tenantId,
    staleTime: 600_000,
  });
}

export function useCalendarConnections() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.calendarConnections(tenantId!),
    queryFn: () =>
      apiClient.get<{ id: string }[]>(
        `/api/tenants/${tenantId}/calendar/connections`,
      ),
    enabled: !!tenantId,
    staleTime: 600_000,
  });
}

export function usePaymentStats() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.paymentStats(tenantId!),
    queryFn: () =>
      apiClient.get<{ totalRevenue: number; currency: string }>(
        `/api/tenants/${tenantId}/payments/stats`,
      ),
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
