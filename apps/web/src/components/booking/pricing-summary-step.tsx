'use client';

import { useState, useMemo } from 'react';
import { Clock, Users, CreditCard } from 'lucide-react';
import { Button, Separator } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';
import { formatPrice, formatDuration, formatTimeDisplay, formatDate } from '@/lib/booking-format-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PricingSummaryStepProps {
  sessionData: BookingSessionData;
  currency: string;
  hasPaymentStep: boolean;
  onContinue: (data: Partial<BookingSessionData>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingSummaryStep({
  sessionData,
  currency,
  hasPaymentStep,
  onContinue,
}: PricingSummaryStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Calculate pricing
  // -------------------------------------------------------------------------

  const pricing = useMemo(() => {
    const basePrice = sessionData.servicePrice ?? 0;
    const guestCount = sessionData.guestCount;
    const pricingModel = sessionData.servicePricingModel ?? 'FIXED';
    const guestConfig = sessionData.guestConfig;
    const guestTierCounts = sessionData.guestTierCounts;

    let subtotal = basePrice;
    const lineItems: Array<{ label: string; amount: number }> = [];

    // Base service
    lineItems.push({
      label: sessionData.serviceName ?? 'Service',
      amount: basePrice,
    });

    // Per-guest pricing
    if (pricingModel === 'PER_GUEST' && guestCount) {
      if (
        guestConfig?.age_tiers &&
        guestConfig.age_tiers.length > 0 &&
        guestTierCounts
      ) {
        // Tier-based
        subtotal = 0;
        // Replace the base line item
        lineItems.length = 0;
        for (const tier of guestConfig.age_tiers) {
          const count = guestTierCounts[tier.label] ?? 0;
          if (count > 0) {
            const tierTotal = tier.price * count;
            subtotal += tierTotal;
            lineItems.push({
              label: `${tier.label} x ${count}`,
              amount: tierTotal,
            });
          }
        }
      } else {
        // Simple per-guest
        const pricePerGuest = guestConfig?.price_per_guest ?? basePrice;
        subtotal = pricePerGuest * guestCount;
        lineItems.length = 0;
        lineItems.push({
          label: `${sessionData.serviceName ?? 'Service'} x ${guestCount} guests`,
          amount: subtotal,
        });
      }
    }

    // Add-on line items
    const selectedAddons = sessionData.selectedAddons;
    let addonsTotal = 0;
    if (selectedAddons && selectedAddons.length > 0) {
      for (const addon of selectedAddons) {
        lineItems.push({
          label: addon.name,
          amount: addon.price,
        });
        addonsTotal += addon.price;
      }
    }

    subtotal += addonsTotal;

    // Use server-provided total if available, otherwise use calculated subtotal
    const total = sessionData.totalAmount ?? subtotal;

    // Deposit calculation (if applicable from session data)
    const depositAmount = sessionData.depositAmount ?? null;

    return { lineItems, subtotal: total, total, depositAmount };
  }, [sessionData]);

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await onContinue({
        totalAmount: pricing.total,
        depositAmount: pricing.depositAmount ?? undefined,
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
      <h2 className="mb-1 text-xl font-semibold">Booking Summary</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Review your booking details before proceeding.
      </p>

      {/* Booking details card */}
      <div className="rounded-lg border">
        {/* Service & appointment info */}
        <div className="space-y-3 p-4">
          <h3 className="font-semibold">
            {sessionData.serviceName ?? 'Service'}
          </h3>

          {sessionData.serviceDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDuration(sessionData.serviceDuration)}
            </div>
          )}

          {sessionData.date && sessionData.startTime && (
            <div className="text-sm">
              <p className="font-medium">{formatDate(sessionData.date)}</p>
              <p className="text-muted-foreground">
                {formatTimeDisplay(sessionData.startTime)}
                {sessionData.endTime &&
                  ` - ${formatTimeDisplay(sessionData.endTime)}`}
              </p>
            </div>
          )}

          {sessionData.guestCount && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              {sessionData.guestCount}{' '}
              {sessionData.guestCount === 1 ? 'guest' : 'guests'}
            </div>
          )}
        </div>

        <Separator />

        {/* Price breakdown */}
        <div className="space-y-2 p-4">
          {pricing.lineItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span>{formatPrice(item.amount, currency)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">
              {formatPrice(pricing.total, currency)}
            </span>
          </div>

          {pricing.depositAmount && pricing.depositAmount < pricing.total && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                Due now (deposit)
              </span>
              <span className="font-medium">
                {formatPrice(pricing.depositAmount, currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reservation notice */}
      {sessionData.reservationId && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your time slot is reserved for 5 minutes.
        </p>
      )}

      {/* Continue button */}
      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={isSubmitting}
        onClick={handleContinue}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Processing...
          </span>
        ) : hasPaymentStep ? (
          'Continue to Payment'
        ) : (
          'Confirm Booking'
        )}
      </Button>
    </div>
  );
}
