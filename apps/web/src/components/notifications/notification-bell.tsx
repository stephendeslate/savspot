'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarCheck,
  CreditCard,
  AlertCircle,
  CalendarSync,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import {
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  queryKeys,
} from '@/hooks/use-api';

// ---------- Types ----------

interface Notification {
  id: string;
  category: 'BOOKING' | 'PAYMENT' | 'SYSTEM' | 'CALENDAR';
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// ---------- Constants ----------

const MAX_BODY_LENGTH = 80;

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  BOOKING: CalendarCheck,
  PAYMENT: CreditCard,
  SYSTEM: AlertCircle,
  CALENDAR: CalendarSync,
};

// ---------- Component ----------

export function NotificationBell() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications(tenantId!),
    queryFn: () =>
      apiClient.get<Notification[]>(
        `/api/tenants/${tenantId}/notifications?limit=10`,
      ),
    enabled: !!tenantId && isOpen,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (notificationId: string) => {
    markReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl?.startsWith('/') && !notification.actionUrl.startsWith('//')) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  const truncateBody = (text: string): string => {
    if (text.length <= MAX_BODY_LENGTH) return text;
    return text.slice(0, MAX_BODY_LENGTH) + '...';
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg sm:w-96"
        >
          {/* Dropdown Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const IconComponent =
                    CATEGORY_ICONS[notification.category] ?? Bell;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                        !notification.isRead && 'bg-primary/5',
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="truncate text-sm font-medium">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {truncateBody(notification.body)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true },
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                View all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
