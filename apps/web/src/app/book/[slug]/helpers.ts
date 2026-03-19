// ---------------------------------------------------------------------------
// Pure helper functions extracted from the booking page for testability.
// ---------------------------------------------------------------------------

export { formatDuration, formatPrice } from '@/lib/booking-format-utils';

// ---------------------------------------------------------------------------
// JSON-LD builder
// ---------------------------------------------------------------------------

export interface JsonLdService {
  name: string;
  description?: string | null;
  basePrice: number;
  currency: string;
  durationMinutes?: number | null;
}

export interface JsonLdTenant {
  name: string;
  description?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  services?: JsonLdService[];
}

export function buildJsonLd(
  tenant: JsonLdTenant,
  slug: string,
  origin: string,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenant.name,
    url: `${origin}/book/${slug}`,
  };

  if (tenant.description) {
    jsonLd['description'] = tenant.description;
  }

  if (tenant.address) {
    jsonLd['address'] = {
      '@type': 'PostalAddress',
      streetAddress: tenant.address,
    };
  }

  if (tenant.contactEmail) {
    jsonLd['email'] = tenant.contactEmail;
  }

  if (tenant.contactPhone) {
    jsonLd['telephone'] = tenant.contactPhone;
  }

  if (tenant.logoUrl) {
    jsonLd['image'] = tenant.logoUrl;
  }

  // Build service offers with duration (ISO 8601) for agentic commerce
  if (tenant.services && tenant.services.length > 0) {
    jsonLd['hasOfferCatalog'] = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: tenant.services.map((svc) => {
        const service: Record<string, unknown> = {
          '@type': 'Service',
          name: svc.name,
        };
        if (svc.description) {
          service['description'] = svc.description;
        }
        if (svc.durationMinutes) {
          // ISO 8601 duration e.g. PT60M, PT1H30M
          const hours = Math.floor(svc.durationMinutes / 60);
          const mins = svc.durationMinutes % 60;
          service['duration'] = `PT${hours > 0 ? `${hours}H` : ''}${mins > 0 ? `${mins}M` : ''}`;
        }

        const offer: Record<string, unknown> = {
          '@type': 'Offer',
          itemOffered: service,
          price: svc.basePrice,
          priceCurrency: svc.currency,
          availability: 'https://schema.org/InStock',
        };

        return offer;
      }),
    };

    // Top-level action for booking (agentic discovery)
    jsonLd['potentialAction'] = {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/book/${slug}`,
        actionPlatform: 'https://schema.org/DesktopWebPlatform',
      },
      result: {
        '@type': 'Reservation',
        name: `Booking at ${tenant.name}`,
      },
    };
  }

  return jsonLd;
}
