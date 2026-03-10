/**
 * Cancellation policy evaluation — pure function implementing SRS-3 §2a.
 *
 * Determines refund amount based on the service's cancellation policy,
 * the booking start time, and the total payment amount.
 */

/**
 * Canonical cancellation policy shape (spec field names).
 */
export interface CancellationPolicy {
  free_cancellation_hours: number;
  late_cancel_fee_type: 'percentage' | 'fixed';
  late_cancel_fee_amount: number;
  no_refund_hours: number;
}

/**
 * Legacy field names used in existing JSONB data (client portal).
 * The evaluator accepts both naming conventions during transition.
 */
interface LegacyCancellationPolicy {
  free_cancellation_hours: number;
  late_cancellation_fee_percent?: number;
  late_cancellation_flat_fee?: number;
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  free_cancellation_hours: 24,
  late_cancel_fee_type: 'percentage',
  late_cancel_fee_amount: 0,
  no_refund_hours: 0,
};

export interface CancellationPolicyResult {
  refundType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND';
  refundAmount: number;
  fee: number;
}

/**
 * Normalizes a raw JSONB policy object to canonical field names.
 * Accepts both spec names and legacy names, preferring spec names.
 */
function normalizePolicy(
  raw: Record<string, unknown>,
): CancellationPolicy {
  const specType = raw['late_cancel_fee_type'] as string | undefined;
  const specAmount = raw['late_cancel_fee_amount'] as number | undefined;

  const legacy = raw as unknown as LegacyCancellationPolicy;

  let feeType: 'percentage' | 'fixed';
  let feeAmount: number;

  if (specType !== undefined && specAmount !== undefined) {
    // Spec field names present — use them
    feeType = specType === 'fixed' ? 'fixed' : 'percentage';
    feeAmount = specAmount;
  } else if (legacy.late_cancellation_flat_fee !== undefined && legacy.late_cancellation_flat_fee > 0) {
    // Legacy flat fee takes precedence when percentage is absent or zero
    feeType = 'fixed';
    feeAmount = legacy.late_cancellation_flat_fee;
  } else if (legacy.late_cancellation_fee_percent !== undefined) {
    feeType = 'percentage';
    feeAmount = legacy.late_cancellation_fee_percent;
  } else {
    feeType = 'percentage';
    feeAmount = 0;
  }

  return {
    free_cancellation_hours: (raw['free_cancellation_hours'] as number) ?? 24,
    late_cancel_fee_type: feeType,
    late_cancel_fee_amount: feeAmount,
    no_refund_hours: (raw['no_refund_hours'] as number) ?? 0,
  };
}

/**
 * Round a number to 2 decimal places (banker-safe).
 */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Evaluate the cancellation policy to determine refund amount.
 *
 * @param policy - The cancellation policy JSONB from the service (or null for default)
 * @param bookingStartTime - The booking's start time
 * @param totalAmount - The total payment amount (in major currency units, e.g. dollars)
 * @param now - Current time (injectable for testing)
 * @returns The refund type, refund amount, and fee (all rounded to 2 decimal places)
 */
export function evaluateCancellationPolicy(
  policy: CancellationPolicy | Record<string, unknown> | null,
  bookingStartTime: Date,
  totalAmount: number,
  now: Date = new Date(),
): CancellationPolicyResult {
  // Zero total → always full refund (nothing to charge)
  if (totalAmount <= 0) {
    return { refundType: 'FULL_REFUND', refundAmount: 0, fee: 0 };
  }

  // Normalize policy — apply defaults if null
  const normalized: CancellationPolicy = policy === null
    ? { ...DEFAULT_CANCELLATION_POLICY }
    : normalizePolicy(policy as Record<string, unknown>);

  const hoursUntilStart =
    (bookingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Free cancellation window (>= boundary is free)
  if (hoursUntilStart >= normalized.free_cancellation_hours) {
    return { refundType: 'FULL_REFUND', refundAmount: round2(totalAmount), fee: 0 };
  }

  // No-refund window (if configured)
  if (normalized.no_refund_hours > 0 && hoursUntilStart <= normalized.no_refund_hours) {
    return { refundType: 'NO_REFUND', refundAmount: 0, fee: round2(totalAmount) };
  }

  // Late cancellation fee
  let fee: number;
  if (normalized.late_cancel_fee_type === 'fixed') {
    fee = Math.min(normalized.late_cancel_fee_amount, totalAmount);
  } else {
    // percentage
    fee = totalAmount * (normalized.late_cancel_fee_amount / 100);
  }

  const refundAmount = Math.max(totalAmount - fee, 0);

  return {
    refundType: 'PARTIAL_REFUND',
    refundAmount: round2(refundAmount),
    fee: round2(fee),
  };
}
