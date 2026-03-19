'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Image from 'next/image';
import { BookingWizard } from '@/components/booking/booking-wizard';
import type {
  TenantData,
  TenantService,
  BookingSession,
} from '@/components/booking/booking-types';
import { API_URL } from '@/components/booking/booking-types';
import { Button } from '@savspot/ui';

// ---------------------------------------------------------------------------
// postMessage helpers
// ---------------------------------------------------------------------------

function postToParent(type: string, payload?: Record<string, unknown>) {
  try {
    window.parent.postMessage({ type, ...payload }, '*');
  } catch {
    // Not in an iframe or cross-origin — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function EmbedBookingInner({ tenant }: { tenant: TenantData }) {
  const [bookingSession, setBookingSession] = useState<BookingSession | null>(null);
  const [startingServiceId, setStartingServiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const brandColor = tenant.brandColor || '#6366f1';

  // Set brand color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', brandColor);
    return () => {
      document.documentElement.style.removeProperty('--brand-color');
    };
  }, [brandColor]);

  // Notify parent that the embed is ready
  useEffect(() => {
    postToParent('savspot:ready');
  }, []);

  // ResizeObserver to notify parent of height changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        postToParent('savspot:resize', {
          height: Math.ceil(entry.contentRect.height),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for theme messages from parent
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (typeof data !== 'object' || data === null) return;
      if (data.type === 'savspot:theme' && typeof data.brandColor === 'string') {
        document.documentElement.style.setProperty('--brand-color', data.brandColor);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startBooking = useCallback(
    async (serviceId: string) => {
      setStartingServiceId(serviceId);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/booking-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            serviceId,
            source: 'WIDGET',
          }),
        });
        if (!res.ok) throw new Error('Failed to start booking session');
        const json = (await res.json()) as { data: BookingSession };
        const session = json.data;
        session.data = session.data ?? {};
        setBookingSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start booking');
      } finally {
        setStartingServiceId(null);
      }
    },
    [tenant.id],
  );

  const exitWizard = useCallback(() => {
    setBookingSession(null);
    postToParent('savspot:close');
  }, []);

  const handleSessionUpdate = useCallback((session: BookingSession) => {
    setBookingSession(session);
    // Notify parent on booking completion
    if (session.status === 'COMPLETED') {
      postToParent('savspot:booked', {
        bookingId: session.data.bookingId,
        serviceName: session.data.serviceName,
        dateTime: session.data.date && session.data.startTime
          ? `${session.data.date}T${session.data.startTime}`
          : undefined,
      });
    }
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm text-destructive">{error}</p>
        <Button size="sm" onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }

  if (bookingSession) {
    return (
      <div ref={containerRef} style={{ '--brand-color': brandColor } as React.CSSProperties}>
        <div className="mb-4 flex items-center gap-3">
          {tenant.logoUrl ? (
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image src={tenant.logoUrl} alt={tenant.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold">{tenant.name}</span>
        </div>

        <BookingWizard
          session={bookingSession}
          tenant={tenant}
          onSessionUpdate={handleSessionUpdate}
          onExit={exitWizard}
        />
      </div>
    );
  }

  // Service selection (when tenant has multiple services)
  return (
    <div ref={containerRef} style={{ '--brand-color': brandColor } as React.CSSProperties}>
      <div className="mb-4 flex items-center gap-3">
        {tenant.logoUrl ? (
          <div className="relative h-8 w-8 overflow-hidden rounded-lg">
            <Image src={tenant.logoUrl} alt={tenant.name} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-semibold">{tenant.name}</span>
      </div>

      <div className="space-y-2">
        {tenant.services.map((service: TenantService) => (
          <button
            key={service.id}
            type="button"
            className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
            onClick={() => startBooking(service.id)}
            disabled={startingServiceId !== null}
          >
            <div>
              <p className="text-sm font-medium">{service.name}</p>
              <p className="text-xs text-muted-foreground">
                {service.durationMinutes} min
              </p>
            </div>
            <span className="text-sm font-semibold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: service.currency || tenant.currency,
              }).format(service.basePrice)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function EmbedBookingClient({ tenant }: { tenant: TenantData }) {
  return (
    <Suspense>
      <EmbedBookingInner tenant={tenant} />
    </Suspense>
  );
}
