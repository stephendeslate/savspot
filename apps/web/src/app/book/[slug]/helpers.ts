// ---------------------------------------------------------------------------
// Pure helper functions extracted from the booking page for testability.
// ---------------------------------------------------------------------------

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// JSON-LD builder
// ---------------------------------------------------------------------------

export interface JsonLdTenant {
  name: string;
  description?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  services?: Array<{
    name: string;
    description?: string | null;
    basePrice: number;
    currency: string;
  }>;
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

  if (tenant.services && tenant.services.length > 0) {
    jsonLd['hasOfferCatalog'] = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: tenant.services.map((svc) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: svc.name,
          ...(svc.description ? { description: svc.description } : {}),
        },
        price: svc.basePrice,
        priceCurrency: svc.currency,
      })),
    };
  }

  return jsonLd;
}
