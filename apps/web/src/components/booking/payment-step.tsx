'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@savspot/ui';
import type { BookingSessionData } from './booking-types';
import { API_URL } from './booking-types';

// ---------------------------------------------------------------------------
// Stripe singleton (loaded once per page)
// ---------------------------------------------------------------------------

const stripePublishableKey =
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? '';

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

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

interface PaymentStepProps {
  sessionId: string;
  sessionData: BookingSessionData;
  currency: string;
  onPaymentComplete: () => Promise<void>;
  isPreview?: boolean;
}

// ---------------------------------------------------------------------------
// Inner form rendered inside <Elements>
// ---------------------------------------------------------------------------

function CheckoutForm({
  chargeAmount,
  currency,
  onPaymentComplete,
}: {
  chargeAmount: number;
  currency: string;
  onPaymentComplete: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!stripe || !elements) return;

      setIsProcessing(true);
      setErrorMessage(null);

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(
          error.message ?? 'Payment failed. Please try again.',
        );
        setIsProcessing(false);
      } else {
        // Payment succeeded — advance to confirmation
        await onPaymentComplete();
      }
    },
    [stripe, elements, onPaymentComplete],
  );

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        className="mt-6 w-full"
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay {formatPrice(chargeAmount, currency)}</>
        )}
      </Button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Secured by Stripe
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PaymentStep({
  sessionId,
  sessionData,
  currency,
  onPaymentComplete,
  isPreview = false,
}: PaymentStepProps) {
  const total = sessionData.totalAmount ?? sessionData.servicePrice ?? 0;
  const deposit = sessionData.depositAmount;
  const chargeAmount = deposit && deposit < total ? deposit : total;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isPreview);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreview) return;

    let cancelled = false;

    async function createPaymentIntent() {
      try {
        const res = await fetch(
          `${API_URL}/api/booking-sessions/${sessionId}/pay`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to create payment');
        }

        const json = (await res.json()) as {
          data: { clientSecret: string };
        };

        if (!cancelled) {
          setClientSecret(json.data.clientSecret);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Payment initialization failed',
          );
          setLoading(false);
        }
      }
    }

    createPaymentIntent();
    return () => {
      cancelled = true;
    };
  }, [sessionId, isPreview]);

  // Preview mode: show mock payment UI
  if (isPreview) {
    return (
      <div className="mx-auto max-w-md">
        <h2 className="mb-1 text-xl font-semibold">Payment</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Complete your payment to confirm the booking.
        </p>

        {/* Amount due */}
        <div className="mb-6 rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {deposit && deposit < total ? 'Deposit due now' : 'Amount due'}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatPrice(chargeAmount, currency)}
          </p>
        </div>

        {/* Mock payment form */}
        <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 p-6 dark:bg-amber-950/20">
          <div className="mb-4 space-y-3">
            <div className="h-10 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              4242 4242 4242 4242
            </div>
            <div className="flex gap-3">
              <div className="h-10 flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                12/29
              </div>
              <div className="h-10 w-20 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                123
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              await onPaymentComplete();
            }}
          >
            Pay {formatPrice(chargeAmount, currency)} (Preview)
          </Button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <Lock className="h-3 w-3" />
            Preview mode — no real charge
          </div>
        </div>
      </div>
    );
  }

  // No Stripe key configured
  if (!stripePromise) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm font-medium text-destructive">
            Payment is not configured for this business.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please contact the business directly to complete your booking.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-md">
        <h2 className="mb-1 text-xl font-semibold">Payment</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Complete your payment to confirm the booking.
        </p>

        <div className="mb-6 rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {deposit && deposit < total ? 'Deposit due now' : 'Amount due'}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatPrice(chargeAmount, currency)}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-lg border p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preparing payment form...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !clientSecret) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm font-medium text-destructive">
            {error ?? 'Failed to initialize payment'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError(null);
              setLoading(true);
              setClientSecret(null);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Stripe Elements
  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-xl font-semibold">Payment</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Complete your payment to confirm the booking.
      </p>

      {/* Amount due */}
      <div className="mb-6 rounded-lg border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {deposit && deposit < total ? 'Deposit due now' : 'Amount due'}
        </p>
        <p className="mt-1 text-2xl font-bold">
          {formatPrice(chargeAmount, currency)}
        </p>
        {deposit && deposit < total && (
          <p className="mt-1 text-xs text-muted-foreground">
            Remaining {formatPrice(total - deposit, currency)} due at
            appointment
          </p>
        )}
      </div>

      {/* Stripe Elements form */}
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CheckoutForm
          chargeAmount={chargeAmount}
          currency={currency}
          onPaymentComplete={onPaymentComplete}
        />
      </Elements>
    </div>
  );
}
