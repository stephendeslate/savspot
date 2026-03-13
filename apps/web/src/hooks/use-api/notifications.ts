import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '../use-tenant';
import { queryKeys } from './query-keys';

interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications(limit = 10) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: queryKeys.notifications(tenantId ?? ''),
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
    queryKey: queryKeys.unreadCount(tenantId ?? ''),
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
