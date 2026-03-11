interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  categoryLabel: string | null;
  address: unknown;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  timezone: string;
  currency: string;
}

export interface BusinessResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  categoryLabel: string | null;
  address: Record<string, unknown> | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  timezone: string;
  currency: string;
  bookingPageUrl: string;
}

export function transformBusiness(tenant: TenantRecord): BusinessResponse {
  const address = tenant.address as Record<string, unknown> | null;
  const safeAddress = address
    ? {
        street: address['street'] ?? null,
        city: address['city'] ?? null,
        state: address['state'] ?? null,
        postalCode: address['postalCode'] ?? null,
        country: address['country'] ?? null,
      }
    : null;

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    description: tenant.description,
    category: tenant.category,
    categoryLabel: tenant.categoryLabel,
    address: safeAddress,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    logoUrl: tenant.logoUrl,
    coverPhotoUrl: tenant.coverPhotoUrl,
    timezone: tenant.timezone,
    currency: tenant.currency,
    bookingPageUrl: `/book/${tenant.slug}`,
  };
}
