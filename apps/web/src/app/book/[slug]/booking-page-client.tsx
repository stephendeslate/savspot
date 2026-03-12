'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Clock, ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
} from '@savspot/ui';
import { BookingWizard } from '@/components/booking/booking-wizard';
import type {
  TenantData,
  TenantService,
  BookingSession,
} from '@/components/booking/booking-types';
import { API_URL } from '@/components/booking/booking-types';
import { formatDuration, formatPrice } from './helpers';

// ---------------------------------------------------------------------------
// Service card
// ---------------------------------------------------------------------------

function ServiceCard({
  service,
  currency,
  onBook,
  isStarting,
}: {
  service: TenantService;
  currency: string;
  onBook: (serviceId: string) => void;
  isStarting: boolean;
}) {
  const displayCurrency = service.currency || currency;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      {service.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <CardHeader className={service.imageUrl ? 'pt-4' : ''}>
        <CardTitle className="text-lg">{service.name}</CardTitle>
        {service.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          {formatDuration(service.durationMinutes)}
        </Badge>
        <Badge variant="outline">
          {service.pricingModel === 'PER_GUEST' ? 'From ' : ''}
          {formatPrice(service.basePrice, displayCurrency)}
        </Badge>
        {service.guestConfig && (
          <Badge variant="secondary">
            {service.guestConfig.min_guests}-{service.guestConfig.max_guests}{' '}
            guests
          </Badge>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Button
          className="w-full"
          onClick={() => onBook(service.id)}
          disabled={isStarting}
          style={{
            backgroundColor: 'var(--brand-color)',
            borderColor: 'var(--brand-color)',
          }}
        >
          {isStarting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Starting...
            </span>
          ) : (
            'Book Now'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Grouped service listing
// ---------------------------------------------------------------------------

const OTHER_SERVICES_LABEL = 'Other Services';

function ServiceGroups({
  services,
  currency,
  onBook,
  startingServiceId,
}: {
  services: TenantService[];
  currency: string;
  onBook: (serviceId: string) => void;
  startingServiceId: string | null;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TenantService[]>();
    for (const service of services) {
      const groupName = service.category?.name ?? OTHER_SERVICES_LABEL;
      const existing = map.get(groupName);
      if (existing) {
        existing.push(service);
      } else {
        map.set(groupName, [service]);
      }
    }
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === OTHER_SERVICES_LABEL) return 1;
      if (b === OTHER_SERVICES_LABEL) return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [services]);

  return (
    <div className="space-y-8">
      {groups.map(([groupName, groupServices]) => (
        <div key={groupName}>
          {groups.length > 1 && (
            <h3 className="mb-3 text-lg font-medium">{groupName}</h3>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                currency={currency}
                onBook={onBook}
                isStarting={startingServiceId === service.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be wrapped in Suspense)
// ---------------------------------------------------------------------------

function BookingPageInner({ tenant }: { tenant: TenantData }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [bookingSession, setBookingSession] = useState<BookingSession | null>(
    null,
  );
  const [startingServiceId, setStartingServiceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const brandColor = tenant.brandColor || '#6366f1';
  const brandCssVars = { '--brand-color': brandColor } as React.CSSProperties;

  // Set brand color CSS variable on document root
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', brandColor);
    return () => {
      document.documentElement.style.removeProperty('--brand-color');
    };
  }, [brandColor]);

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
            source: 'DIRECT',
            ...(isPreview && { isPreview: true }),
          }),
        });
        if (!res.ok) {
          throw new Error('Failed to start booking session');
        }
        const json = (await res.json()) as { data: BookingSession };
        const session = json.data;
        session.data = session.data ?? {};
        setBookingSession(session);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not start booking',
        );
      } finally {
        setStartingServiceId(null);
      }
    },
    [tenant.id, isPreview],
  );

  const exitWizard = useCallback(() => {
    setBookingSession(null);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Button onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }

  if (bookingSession) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6" style={brandCssVars}>
        <button
          onClick={exitWizard}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {tenant.name}
        </button>

        <div className="mb-6 flex items-center gap-3">
          {tenant.logoUrl ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
              <Image
                src={tenant.logoUrl}
                alt={tenant.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold">{tenant.name}</span>
        </div>

        <BookingWizard
          session={bookingSession}
          tenant={tenant}
          onSessionUpdate={setBookingSession}
          onExit={exitWizard}
          isPreview={isPreview}
        />
      </div>
    );
  }

  return (
    <div style={brandCssVars}>
      <Separator className="my-6" />

      <section>
        <h2
          className="mb-4 text-xl font-semibold"
          style={{ color: brandColor }}
        >
          Our Services
        </h2>
        {tenant.services.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No services available at this time. Please check back later.
          </p>
        ) : (
          <ServiceGroups
            services={tenant.services}
            currency={tenant.currency}
            onBook={startBooking}
            startingServiceId={startingServiceId}
          />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported client component (wraps inner with Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export function BookingPageClient({ tenant }: { tenant: TenantData }) {
  return (
    <Suspense>
      <BookingPageInner tenant={tenant} />
    </Suspense>
  );
}
