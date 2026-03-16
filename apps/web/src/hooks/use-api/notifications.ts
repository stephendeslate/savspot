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
  const notifKey = queryKeys.notifications(tenantId ?? '');
  const countKey = queryKeys.unreadCount(tenantId ?? '');
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(
        `/api/tenants/${tenantId}/notifications/${notificationId}/read`,
      ),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notifKey });
      await queryClient.cancelQueries({ queryKey: countKey });
      const previousNotifs = queryClient.getQueryData<Notification[]>(notifKey);
      const previousCount = queryClient.getQueryData<{ count: number }>(countKey);
      queryClient.setQueryData<Notification[]>(notifKey, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      queryClient.setQueryData<{ count: number }>(countKey, (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old,
      );
      return { previousNotifs, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifs) {
        queryClient.setQueryData(notifKey, context.previousNotifs);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
    },
    onSettled: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: notifKey });
        void queryClient.invalidateQueries({ queryKey: countKey });
      }
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const notifKey = queryKeys.notifications(tenantId ?? '');
  const countKey = queryKeys.unreadCount(tenantId ?? '');
  return useMutation({
    mutationFn: () =>
      apiClient.post(`/api/tenants/${tenantId}/notifications/read-all`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notifKey });
      await queryClient.cancelQueries({ queryKey: countKey });
      const previousNotifs = queryClient.getQueryData<Notification[]>(notifKey);
      const previousCount = queryClient.getQueryData<{ count: number }>(countKey);
      queryClient.setQueryData<Notification[]>(notifKey, (old) =>
        old?.map((n) => ({ ...n, isRead: true })),
      );
      queryClient.setQueryData<{ count: number }>(countKey, () => ({ count: 0 }));
      return { previousNotifs, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifs) {
        queryClient.setQueryData(notifKey, context.previousNotifs);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
    },
    onSettled: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: notifKey });
        void queryClient.invalidateQueries({ queryKey: countKey });
      }
    },
  });
}
