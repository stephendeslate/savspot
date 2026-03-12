import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Badge } from '@savspot/ui';
import type { TenantData } from '@/components/booking/booking-types';
import { buildJsonLd } from './helpers';
import { BookingPageClient } from './booking-page-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
const SITE_URL = process.env['NEXT_PUBLIC_URL'] || 'http://localhost:3000';

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
// Hero section (server-rendered, no interactivity)
// ---------------------------------------------------------------------------

function HeroSection({ tenant }: { tenant: TenantData }) {
  const brandStyle: React.CSSProperties = tenant.brandColor
    ? { backgroundColor: tenant.brandColor, color: '#ffffff' }
    : {};

  return (
    <div className="mb-8">
      {/* Cover photo */}
      {tenant.coverPhotoUrl ? (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-xl sm:h-64">
          <Image
            src={tenant.coverPhotoUrl}
            alt={`${tenant.name} cover`}
            fill
            className="object-cover"
            unoptimized
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
            <Image
              src={tenant.logoUrl}
              alt={`${tenant.name} logo`}
              fill
              className="object-cover"
              unoptimized
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
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{tenant.name}</h1>
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
              {[tenant.address.street, tenant.address.city, tenant.address.state, tenant.address.zip].filter(Boolean).join(', ')}
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
// Server component page
// ---------------------------------------------------------------------------

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(`${API_URL}/api/book/${slug}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(`Failed to load booking page: ${res.status}`);
  }

  const json = (await res.json()) as { data: TenantData };
  const tenant = json.data;

  const jsonLd = buildJsonLd(
    {
      name: tenant.name,
      description: tenant.description,
      address: tenant.address
        ? [tenant.address.street, tenant.address.city, tenant.address.state, tenant.address.zip].filter(Boolean).join(', ')
        : null,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      logoUrl: tenant.logoUrl,
      services: tenant.services.map((s) => ({
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        currency: s.currency || tenant.currency,
      })),
    },
    slug,
    SITE_URL,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection tenant={tenant} />
      <BookingPageClient tenant={tenant} />
    </div>
  );
}
