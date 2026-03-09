'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'push-prompt-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  if (isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

export function PushPrompt() {
  const { tenantId } = useTenant();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'default') return;
    if (isDismissedRecently()) return;
    setVisible(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  const handleEnable = useCallback(async () => {
    const vapidPublicKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
    if (!vapidPublicKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
      }
      setVisible(false);
      return;
    }

    setEnabling(true);

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setVisible(false);
        return;
      }

      const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      const keys = json.keys ?? {};

      await apiClient.post('/api/users/me/push-subscriptions', {
        endpoint: json.endpoint,
        keys: {
          p256dh: keys['p256dh'],
          auth: keys['auth'],
        },
        tenantId,
      });

      setVisible(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to enable push notifications:', error);
      }
    } finally {
      setEnabling(false);
    }
  }, [tenantId]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3',
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          Enable push notifications to get instant booking alerts
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={enabling}
          className={cn(
            'inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors',
            'hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {enabling ? 'Enabling...' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
