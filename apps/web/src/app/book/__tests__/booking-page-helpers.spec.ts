import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatPrice,
  buildJsonLd,
  type JsonLdTenant,
} from '../[slug]/helpers';

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('should return "30 min" for 30 minutes', () => {
    expect(formatDuration(30)).toBe('30 min');
  });

  it('should return "1h" for 60 minutes', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('should return "1h 30min" for 90 minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });

  it('should return "0 min" for 0 minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
  });

  it('should return "2h" for 120 minutes', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('should return "3h 15min" for 195 minutes', () => {
    expect(formatDuration(195)).toBe('3h 15min');
  });

  it('should return "45 min" for 45 minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
  });
});

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

describe('formatPrice', () => {
  it('should format USD correctly', () => {
    expect(formatPrice(29.99, 'USD')).toBe('$29.99');
  });

  it('should format zero as $0.00', () => {
    expect(formatPrice(0, 'USD')).toBe('$0.00');
  });

  it('should format GBP with pound sign', () => {
    expect(formatPrice(100, 'GBP')).toBe('\u00A3100.00');
  });

  it('should include two decimal places for whole numbers', () => {
    expect(formatPrice(50, 'USD')).toBe('$50.00');
  });
});

// ---------------------------------------------------------------------------
// buildJsonLd
// ---------------------------------------------------------------------------

describe('buildJsonLd', () => {
  const ORIGIN = 'https://app.savspot.com';
  const SLUG = 'acme-salon';

  it('should build basic JSON-LD with name and URL only', () => {
    const tenant: JsonLdTenant = { name: 'Acme Salon' };
    const result = buildJsonLd(tenant, SLUG, ORIGIN);

    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('LocalBusiness');
    expect(result['name']).toBe('Acme Salon');
    expect(result['url']).toBe(`${ORIGIN}/book/${SLUG}`);
    expect(result['description']).toBeUndefined();
    expect(result['address']).toBeUndefined();
    expect(result['email']).toBeUndefined();
    expect(result['telephone']).toBeUndefined();
    expect(result['image']).toBeUndefined();
    expect(result['hasOfferCatalog']).toBeUndefined();
  });

  it('should include all optional fields when provided', () => {
    const tenant: JsonLdTenant = {
      name: 'Acme Salon',
      description: 'Best salon in town',
      address: '123 Main St, Anytown, USA',
      contactEmail: 'info@acme.com',
      contactPhone: '+1-555-0100',
      logoUrl: 'https://cdn.savspot.com/logo.png',
    };

    const result = buildJsonLd(tenant, SLUG, ORIGIN);

    expect(result['description']).toBe('Best salon in town');
    expect(result['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '123 Main St, Anytown, USA',
    });
    expect(result['email']).toBe('info@acme.com');
    expect(result['telephone']).toBe('+1-555-0100');
    expect(result['image']).toBe('https://cdn.savspot.com/logo.png');
  });

  it('should include hasOfferCatalog when tenant has services', () => {
    const tenant: JsonLdTenant = {
      name: 'Acme Salon',
      services: [
        {
          name: 'Haircut',
          description: 'A great haircut',
          basePrice: 50,
          currency: 'USD',
        },
        {
          name: 'Coloring',
          description: null,
          basePrice: 120,
          currency: 'USD',
        },
      ],
    };

    const result = buildJsonLd(tenant, SLUG, ORIGIN);
    const catalog = result['hasOfferCatalog'] as Record<string, unknown>;

    expect(catalog['@type']).toBe('OfferCatalog');
    expect(catalog['name']).toBe('Services');

    const items = catalog['itemListElement'] as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);

    expect(items[0]!['@type']).toBe('Offer');
    expect(items[0]!['price']).toBe(50);
    expect(items[0]!['priceCurrency']).toBe('USD');

    const offered = items[0]!['itemOffered'] as Record<string, unknown>;
    expect(offered['@type']).toBe('Service');
    expect(offered['name']).toBe('Haircut');
    expect(offered['description']).toBe('A great haircut');

    // Second service has null description — should be omitted
    const offered2 = items[1]!['itemOffered'] as Record<string, unknown>;
    expect(offered2['description']).toBeUndefined();
  });

  it('should omit hasOfferCatalog when services array is empty', () => {
    const tenant: JsonLdTenant = { name: 'Acme Salon', services: [] };
    const result = buildJsonLd(tenant, SLUG, ORIGIN);

    expect(result['hasOfferCatalog']).toBeUndefined();
  });

  it('should omit null optional fields', () => {
    const tenant: JsonLdTenant = {
      name: 'Acme Salon',
      description: null,
      address: null,
      contactEmail: null,
      contactPhone: null,
      logoUrl: null,
    };

    const result = buildJsonLd(tenant, SLUG, ORIGIN);

    expect(result['description']).toBeUndefined();
    expect(result['address']).toBeUndefined();
    expect(result['email']).toBeUndefined();
    expect(result['telephone']).toBeUndefined();
    expect(result['image']).toBeUndefined();
  });
});
