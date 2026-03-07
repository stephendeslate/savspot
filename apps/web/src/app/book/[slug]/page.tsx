'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { BookingWizard } from '@/components/booking/booking-wizard';
import type {
  TenantData,
  TenantService,
  BookingSession,
} from '@/components/booking/booking-types';
import { API_URL } from '@/components/booking/booking-types';
import { formatDuration, formatPrice } from './helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  VENUE: 'Venue / Event Space',
  SALON: 'Salon / Barbershop',
  STUDIO: 'Studio',
  FITNESS: 'Fitness / Wellness',
  PROFESSIONAL: 'Professional Services',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BookingPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero skeleton */}
      <div className="mb-8">
        <Skeleton className="mb-4 h-40 w-full rounded-xl" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      {/* Services skeleton */}
      <Skeleton className="mb-4 h-6 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-found view
// ---------------------------------------------------------------------------

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-3xl font-bold">Business Not Found</h1>
      <p className="mb-6 text-muted-foreground">
        We could not find a business with the URL &ldquo;{slug}&rdquo;. It
        may have been removed or the link may be incorrect.
      </p>
      <Button variant="outline" onClick={() => window.history.back()}>
        Go Back
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error view
// ---------------------------------------------------------------------------

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-6 text-muted-foreground">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

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
          <img
            src={service.imageUrl}
            alt={service.name}
            className="h-full w-full object-cover"
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
// Hero section
// ---------------------------------------------------------------------------

function HeroSection({
  tenant,
  brandStyle,
}: {
  tenant: TenantData;
  brandStyle: React.CSSProperties;
}) {
  return (
    <div className="mb-8">
      {/* Cover photo */}
      {tenant.coverPhotoUrl ? (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-xl sm:h-64">
          <img
            src={tenant.coverPhotoUrl}
            alt={`${tenant.name} cover`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div
          className="mb-6 h-32 w-full rounded-xl sm:h-48"
          style={{
            background: tenant.brandColor
              ? `linear-gradient(135deg, ${tenant.brandColor}, ${tenant.brandColor}88)`
              : 'linear-gradient(135deg, hsl(222.2 47.4% 11.2%), hsl(222.2 47.4% 25%))',
          }}
        />
      )}

      {/* Business info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Logo */}
        {tenant.logoUrl ? (
          <div className="-mt-10 ml-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-4 border-background bg-background shadow-md sm:-mt-12 sm:h-24 sm:w-24">
            <img
              src={tenant.logoUrl}
              alt={`${tenant.name} logo`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="-mt-10 ml-4 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-4 border-background bg-primary text-2xl font-bold text-primary-foreground shadow-md sm:-mt-12 sm:h-24 sm:w-24"
            style={brandStyle}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{tenant.name}</h1>
          {tenant.description && (
            <p className="mt-1 text-muted-foreground">{tenant.description}</p>
          )}
          {tenant.category && (
            <Badge variant="secondary" className="mt-2">
              {tenant.categoryLabel || CATEGORY_LABELS[tenant.category] || tenant.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Contact info */}
      {(tenant.address || tenant.contactEmail || tenant.contactPhone) && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {tenant.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {tenant.address}
            </span>
          )}
          {tenant.contactEmail && (
            <a
              href={`mailto:${tenant.contactEmail}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              {tenant.contactEmail}
            </a>
          )}
          {tenant.contactPhone && (
            <a
              href={`tel:${tenant.contactPhone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              {tenant.contactPhone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const params = useParams();
  const slug = params['slug'] as string;

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking session state
  const [bookingSession, setBookingSession] = useState<BookingSession | null>(
    null,
  );
  const [startingServiceId, setStartingServiceId] = useState<string | null>(
    null,
  );

  // Fetch tenant data
  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetch(`${API_URL}/api/book/${slug}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load business information');
      }
      const json = (await res.json()) as { data: TenantData };
      setTenant(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Set OG meta tags dynamically (client-side supplement)
  useEffect(() => {
    if (!tenant) return;
    document.title = `Book with ${tenant.name} | SavSpot`;
  }, [tenant]);

  // Start a booking session
  const startBooking = async (serviceId: string) => {
    if (!tenant) return;
    setStartingServiceId(serviceId);
    try {
      const res = await fetch(`${API_URL}/api/booking-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          serviceId,
          source: 'DIRECT',
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
  };

  // Exit the booking wizard and return to service listing
  const exitWizard = () => {
    setBookingSession(null);
  };

  // ------------ Render states -----------------------------------------------

  if (loading) {
    return <BookingPageSkeleton />;
  }

  if (notFound) {
    return <NotFound slug={slug} />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchTenant} />;
  }

  if (!tenant) {
    return null;
  }

  // Brand color CSS custom property and accent style
  const brandColor = tenant.brandColor || '#6366f1';
  const brandCssVars = { '--brand-color': brandColor } as React.CSSProperties;
  const brandStyle: React.CSSProperties = tenant.brandColor
    ? { backgroundColor: tenant.brandColor, color: '#ffffff' }
    : {};

  // If we have an active booking session, show the wizard
  if (bookingSession) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-6"
        style={brandCssVars}
      >
        {/* Back to services */}
        <button
          onClick={exitWizard}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {tenant.name}
        </button>

        {/* Business header (compact) */}
        <div className="mb-6 flex items-center gap-3">
          {tenant.logoUrl ? (
            <div className="h-10 w-10 overflow-hidden rounded-lg">
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-full w-full object-cover"
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
        />
      </div>
    );
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenant.name,
    ...(tenant.description && { description: tenant.description }),
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${slug}`,
    ...(tenant.address && { address: tenant.address }),
    ...(tenant.contactEmail && { email: tenant.contactEmail }),
    ...(tenant.contactPhone && { telephone: tenant.contactPhone }),
    ...(tenant.logoUrl && { image: tenant.logoUrl }),
    ...(tenant.services.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: tenant.services.map((s) => ({
          '@type': 'Offer',
          name: s.name,
          ...(s.description && { description: s.description }),
          price: s.basePrice,
          priceCurrency: s.currency || tenant.currency,
        })),
      },
    }),
  };

  // Main booking page with service listing
  return (
    <div
      className="mx-auto max-w-5xl px-4 py-8"
      style={brandCssVars}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection tenant={tenant} brandStyle={brandStyle} />

      <Separator className="my-6" />

      {/* Service listing */}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenant.services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                currency={tenant.currency}
                onBook={startBooking}
                isStarting={startingServiceId === service.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
