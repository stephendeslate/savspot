'use client';

import type { BookingSessionData, BookingStepType } from './booking-types';
import { formatPrice, formatDuration } from '@/lib/booking-format-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingPriceBarProps {
  sessionData: BookingSessionData;
  currency: string;
  currentStepType: BookingStepType;
  serviceDuration: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeRunningTotal(data: BookingSessionData): number {
  let total = data.servicePrice ?? 0;

  // Guest-based pricing adjustments
  if (data.guestCount && data.guestConfig) {
    const perGuest = data.guestConfig.price_per_guest ?? 0;
    if (perGuest > 0) {
      total = perGuest * data.guestCount;
    }
    // Tier-based pricing
    if (data.guestTierCounts && data.guestConfig.age_tiers) {
      let tierTotal = 0;
      for (const tier of data.guestConfig.age_tiers) {
        const count = data.guestTierCounts[tier.label] ?? 0;
        tierTotal += tier.price * count;
      }
      if (tierTotal > 0) total = tierTotal;
    }
  }

  // Add-on prices
  if (data.selectedAddons?.length) {
    for (const addon of data.selectedAddons) {
      total += addon.price;
    }
  }

  return total;
}

// Steps where the bar should be hidden
const HIDDEN_STEPS: BookingStepType[] = ['CONFIRMATION'];

// Steps before a service is selected (no price to show)
const PRE_SERVICE_STEPS: BookingStepType[] = ['SERVICE_SELECTION'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingPriceBar({
  sessionData,
  currency,
  currentStepType,
  serviceDuration,
}: BookingPriceBarProps) {
  if (HIDDEN_STEPS.includes(currentStepType)) return null;
  if (PRE_SERVICE_STEPS.includes(currentStepType) && !sessionData.serviceName) return null;

  const total = computeRunningTotal(sessionData);
  const deposit = sessionData.depositAmount;
  const showDeposit = deposit != null && deposit > 0 && deposit < total;
  const name = sessionData.serviceName;

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
      <div className="min-w-0 flex-1">
        {name && (
          <p className="truncate text-sm font-medium">{name}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {serviceDuration && (
            <span>{formatDuration(serviceDuration)}</span>
          )}
          {serviceDuration && total > 0 && <span aria-hidden="true">&middot;</span>}
          {total > 0 && (
            <span className="font-semibold text-foreground">
              {formatPrice(total, currency)}
            </span>
          )}
          {showDeposit && (
            <span className="text-muted-foreground">
              (Deposit: {formatPrice(deposit, currency)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
