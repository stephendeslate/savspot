'use client';

import { useState, useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { GuestConfig, BookingSessionData } from './booking-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GuestCountStepProps {
  guestConfig: GuestConfig | null;
  basePrice: number;
  currency: string;
  pricingModel: string;
  currentCount?: number;
  currentTierCounts?: Record<string, number>;
  onContinue: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Counter component
// ---------------------------------------------------------------------------

function CounterControl({
  label,
  sublabel,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center text-sm font-semibold">{value}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GuestCountStep({
  guestConfig,
  basePrice,
  currency,
  pricingModel,
  currentCount,
  currentTierCounts,
  onContinue,
}: GuestCountStepProps) {
  const hasTiers =
    guestConfig?.age_tiers && guestConfig.age_tiers.length > 0;
  const minGuests = guestConfig?.min_guests ?? 1;
  const maxGuests = guestConfig?.max_guests ?? 20;

  // Simple guest count (no tiers)
  const [guestCount, setGuestCount] = useState<number>(
    currentCount ?? minGuests,
  );

  // Tier-based guest counts
  const [tierCounts, setTierCounts] = useState<Record<string, number>>(() => {
    if (currentTierCounts) return currentTierCounts;
    if (!hasTiers || !guestConfig?.age_tiers) return {};
    const initial: Record<string, number> = {};
    for (const tier of guestConfig.age_tiers) {
      initial[tier.label] = 0;
    }
    // Set first tier to minimum
    const firstTier = guestConfig.age_tiers[0];
    if (firstTier) {
      initial[firstTier.label] = minGuests;
    }
    return initial;
  });

  const totalTierGuests = useMemo(() => {
    return Object.values(tierCounts).reduce((sum, count) => sum + count, 0);
  }, [tierCounts]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Price calculation
  // -------------------------------------------------------------------------

  const priceImpact = useMemo(() => {
    if (pricingModel !== 'PER_GUEST') {
      return { total: basePrice, breakdown: null };
    }

    if (hasTiers && guestConfig?.age_tiers) {
      let total = 0;
      const breakdown: Array<{ label: string; count: number; price: number; subtotal: number }> = [];

      for (const tier of guestConfig.age_tiers) {
        const count = tierCounts[tier.label] ?? 0;
        const subtotal = tier.price * count;
        total += subtotal;
        breakdown.push({
          label: tier.label,
          count,
          price: tier.price,
          subtotal,
        });
      }

      return { total, breakdown };
    }

    // Simple per-guest pricing
    const pricePerGuest = guestConfig?.price_per_guest ?? basePrice;
    return {
      total: pricePerGuest * guestCount,
      breakdown: null,
    };
  }, [pricingModel, basePrice, hasTiers, guestConfig, tierCounts, guestCount]);

  // -------------------------------------------------------------------------
  // Validate and continue
  // -------------------------------------------------------------------------

  const effectiveCount = hasTiers ? totalTierGuests : guestCount;
  const isValid = effectiveCount >= minGuests && effectiveCount <= maxGuests;

  const handleContinue = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      await onContinue({
        guestCount: effectiveCount,
        guestTierCounts: hasTiers ? tierCounts : undefined,
        totalAmount: priceImpact.total,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-xl font-semibold">Number of Guests</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        How many guests will be attending?
        {minGuests > 1 && ` (minimum ${minGuests})`}
      </p>

      <div className="rounded-lg border p-4">
        {hasTiers && guestConfig?.age_tiers ? (
          // Tier-based input
          <>
            {guestConfig.age_tiers.map((tier, index) => (
              <div key={tier.label}>
                {index > 0 && <Separator />}
                <CounterControl
                  label={tier.label}
                  sublabel={`Ages ${tier.min_age}-${tier.max_age} - ${formatPrice(tier.price, currency)} each`}
                  value={tierCounts[tier.label] ?? 0}
                  min={0}
                  max={maxGuests - (totalTierGuests - (tierCounts[tier.label] ?? 0))}
                  onChange={(v) =>
                    setTierCounts((prev) => ({ ...prev, [tier.label]: v }))
                  }
                />
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between pt-3 text-sm">
              <span className="font-medium">Total guests</span>
              <span
                className={
                  !isValid
                    ? 'font-semibold text-destructive'
                    : 'font-semibold'
                }
              >
                {totalTierGuests}
              </span>
            </div>
          </>
        ) : (
          // Simple count input
          <CounterControl
            label="Guests"
            sublabel={
              pricingModel === 'PER_GUEST' && guestConfig?.price_per_guest
                ? `${formatPrice(guestConfig.price_per_guest, currency)} per guest`
                : undefined
            }
            value={guestCount}
            min={minGuests}
            max={maxGuests}
            onChange={setGuestCount}
          />
        )}
      </div>

      {/* Price impact */}
      {pricingModel === 'PER_GUEST' && (
        <div className="mt-4 rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium">Estimated Total</p>
          {priceImpact.breakdown && (
            <div className="mt-2 space-y-1">
              {priceImpact.breakdown
                .filter((item) => item.count > 0)
                .map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>
                      {item.label} x {item.count}
                    </span>
                    <span>{formatPrice(item.subtotal, currency)}</span>
                  </div>
                ))}
            </div>
          )}
          <p className="mt-2 text-lg font-bold">
            {formatPrice(priceImpact.total, currency)}
          </p>
        </div>
      )}

      {/* Validation message */}
      {!isValid && effectiveCount > 0 && (
        <p className="mt-3 text-sm text-destructive">
          Guest count must be between {minGuests} and {maxGuests}.
        </p>
      )}

      {/* Continue button */}
      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={!isValid || isSubmitting}
        onClick={handleContinue}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Processing...
          </span>
        ) : (
          'Continue'
        )}
      </Button>
    </div>
  );
}
