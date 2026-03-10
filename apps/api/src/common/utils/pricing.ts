/**
 * Pricing model types matching the PricingModel enum in Prisma.
 */
export type PricingModel = 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';

/**
 * A single tier in a tiered pricing configuration.
 */
export interface PricingTier {
  minGuests: number;
  maxGuests: number;
  pricePerPerson: number;
}

/**
 * Options for calculating the price of a service.
 */
export interface CalculatePriceOptions {
  durationMinutes: number;
  guestCount?: number;
}

/**
 * Minimal service shape required for pricing calculation.
 * basePrice can be a Prisma Decimal or a plain number.
 */
export interface PricingService {
  pricingModel: string;
  basePrice: number | { toNumber(): number };
  tierConfig?: unknown;
}

/**
 * Extracts a numeric value from a Prisma Decimal, plain number, or object with toNumber().
 */
function toNumber(value: number | { toNumber(): number }): number {
  if (typeof value === 'number') return value;
  if (typeof (value as { toNumber(): number }).toNumber === 'function') {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}

/**
 * Calculates the total price for a service based on its pricing model.
 *
 * - FIXED:   returns basePrice (flat rate per booking)
 * - HOURLY:  returns basePrice * (durationMinutes / 60)
 * - TIERED:  reads tierConfig JSON array, matches guest count to a tier,
 *            returns matchedTier.pricePerPerson * guestCount
 * - CUSTOM:  returns basePrice (custom pricing is set manually per booking)
 *
 * Returns the price in major currency units (dollars, not cents).
 */
export function calculatePrice(
  service: PricingService,
  options: CalculatePriceOptions,
): number {
  const basePrice = toNumber(service.basePrice);

  switch (service.pricingModel as PricingModel) {
    case 'FIXED':
      return basePrice;

    case 'HOURLY': {
      const hours = options.durationMinutes / 60;
      // Round to 2 decimal places to avoid floating point issues
      return Math.round(basePrice * hours * 100) / 100;
    }

    case 'TIERED': {
      const guestCount = options.guestCount ?? 1;
      const tiers = parseTierConfig(service.tierConfig);

      if (tiers.length === 0) {
        // No tier config — fall back to basePrice
        return basePrice;
      }

      const matchedTier = tiers.find(
        (t) => guestCount >= t.minGuests && guestCount <= t.maxGuests,
      );

      if (!matchedTier) {
        // No matching tier — use the last tier (highest guest count)
        const lastTier = tiers[tiers.length - 1]!;
        return Math.round(lastTier.pricePerPerson * guestCount * 100) / 100;
      }

      return Math.round(matchedTier.pricePerPerson * guestCount * 100) / 100;
    }

    case 'CUSTOM':
      // Custom pricing is set manually per booking; basePrice is the default
      return basePrice;

    default:
      return basePrice;
  }
}

/**
 * Parses the tierConfig JSON field into a typed array of pricing tiers.
 */
function parseTierConfig(tierConfig: unknown): PricingTier[] {
  if (!tierConfig) return [];
  if (!Array.isArray(tierConfig)) return [];

  return tierConfig.filter(
    (t): t is PricingTier =>
      typeof t === 'object' &&
      t !== null &&
      typeof t.minGuests === 'number' &&
      typeof t.maxGuests === 'number' &&
      typeof t.pricePerPerson === 'number',
  );
}
