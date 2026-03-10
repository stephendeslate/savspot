import { describe, it, expect } from 'vitest';
import {
  evaluateCancellationPolicy,
  CancellationPolicy,
  DEFAULT_CANCELLATION_POLICY,
} from './cancellation-policy.evaluator';

/**
 * Helper: create a Date that is `hours` hours after `base`.
 */
function hoursFromNow(hours: number, base: Date): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

describe('evaluateCancellationPolicy', () => {
  const now = new Date('2026-03-10T12:00:00Z');

  describe('null policy (defaults)', () => {
    it('should apply default free cancellation (>24h before) → FULL_REFUND', () => {
      const startTime = hoursFromNow(48, now);
      const result = evaluateCancellationPolicy(null, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'FULL_REFUND',
        refundAmount: 100,
        fee: 0,
      });
    });

    it('should apply default policy (<24h before, 0% fee) → PARTIAL_REFUND with $0 fee', () => {
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(null, startTime, 100, now);

      // Default fee is 0%, so partial refund with no actual deduction
      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 100,
        fee: 0,
      });
    });
  });

  describe('free cancellation window', () => {
    const policy: CancellationPolicy = {
      free_cancellation_hours: 24,
      late_cancel_fee_type: 'percentage',
      late_cancel_fee_amount: 50,
      no_refund_hours: 0,
    };

    it('should return FULL_REFUND when well within free window', () => {
      const startTime = hoursFromNow(48, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'FULL_REFUND',
        refundAmount: 100,
        fee: 0,
      });
    });

    it('should return FULL_REFUND at exact boundary (24h)', () => {
      const startTime = hoursFromNow(24, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'FULL_REFUND',
        refundAmount: 100,
        fee: 0,
      });
    });
  });

  describe('late cancellation — percentage fee', () => {
    const policy: CancellationPolicy = {
      free_cancellation_hours: 24,
      late_cancel_fee_type: 'percentage',
      late_cancel_fee_amount: 50,
      no_refund_hours: 0,
    };

    it('should return PARTIAL_REFUND with 50% fee', () => {
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 50,
        fee: 50,
      });
    });
  });

  describe('late cancellation — fixed fee', () => {
    const policy: CancellationPolicy = {
      free_cancellation_hours: 24,
      late_cancel_fee_type: 'fixed',
      late_cancel_fee_amount: 30,
      no_refund_hours: 0,
    };

    it('should return PARTIAL_REFUND with $30 fixed fee', () => {
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 70,
        fee: 30,
      });
    });

    it('should cap fixed fee at total amount when fee exceeds total', () => {
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(policy, startTime, 25, now);

      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 0,
        fee: 25,
      });
    });
  });

  describe('no-refund window', () => {
    const policy: CancellationPolicy = {
      free_cancellation_hours: 24,
      late_cancel_fee_type: 'percentage',
      late_cancel_fee_amount: 50,
      no_refund_hours: 2,
    };

    it('should return NO_REFUND when within no-refund window', () => {
      const startTime = hoursFromNow(1, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'NO_REFUND',
        refundAmount: 0,
        fee: 100,
      });
    });

    it('should return NO_REFUND at exact no-refund boundary (2h)', () => {
      const startTime = hoursFromNow(2, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'NO_REFUND',
        refundAmount: 0,
        fee: 100,
      });
    });

    it('should return PARTIAL_REFUND just above no-refund boundary', () => {
      const startTime = hoursFromNow(2.01, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      expect(result.refundType).toBe('PARTIAL_REFUND');
      expect(result.refundAmount).toBe(50);
      expect(result.fee).toBe(50);
    });
  });

  describe('past start time', () => {
    it('should return NO_REFUND when past start time and no_refund_hours > 0', () => {
      const policy: CancellationPolicy = {
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage',
        late_cancel_fee_amount: 50,
        no_refund_hours: 2,
      };
      const startTime = hoursFromNow(-1, now); // 1 hour ago
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      // hours_until_start is -1, which is <= no_refund_hours (2)
      expect(result).toEqual({
        refundType: 'NO_REFUND',
        refundAmount: 0,
        fee: 100,
      });
    });

    it('should return PARTIAL_REFUND when past start time and no_refund_hours = 0', () => {
      const policy: CancellationPolicy = {
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage',
        late_cancel_fee_amount: 50,
        no_refund_hours: 0,
      };
      const startTime = hoursFromNow(-1, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      // no_refund_hours is 0, so no-refund check is skipped; falls through to late cancel
      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 50,
        fee: 50,
      });
    });
  });

  describe('zero total amount', () => {
    it('should return FULL_REFUND with $0 amounts', () => {
      const policy: CancellationPolicy = {
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage',
        late_cancel_fee_amount: 50,
        no_refund_hours: 2,
      };
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(policy, startTime, 0, now);

      expect(result).toEqual({
        refundType: 'FULL_REFUND',
        refundAmount: 0,
        fee: 0,
      });
    });
  });

  describe('rounding', () => {
    it('should round refund and fee to 2 decimal places', () => {
      const policy: CancellationPolicy = {
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage',
        late_cancel_fee_amount: 33,
        no_refund_hours: 0,
      };
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(policy, startTime, 100, now);

      // 33% of 100 = 33; refund = 67
      expect(result.fee).toBe(33);
      expect(result.refundAmount).toBe(67);

      // With an amount that produces fractional cents
      const result2 = evaluateCancellationPolicy(policy, startTime, 99.99, now);
      expect(result2.fee).toBe(33);
      expect(result2.refundAmount).toBe(66.99);
    });
  });

  describe('legacy field names', () => {
    it('should accept late_cancellation_fee_percent (legacy percentage)', () => {
      const legacyPolicy = {
        free_cancellation_hours: 24,
        late_cancellation_fee_percent: 25,
      };
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(legacyPolicy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 75,
        fee: 25,
      });
    });

    it('should accept late_cancellation_flat_fee (legacy fixed)', () => {
      const legacyPolicy = {
        free_cancellation_hours: 24,
        late_cancellation_flat_fee: 20,
      };
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(legacyPolicy, startTime, 100, now);

      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 80,
        fee: 20,
      });
    });

    it('should prefer spec field names over legacy names', () => {
      const mixedPolicy = {
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage' as const,
        late_cancel_fee_amount: 10,
        late_cancellation_fee_percent: 50, // legacy — should be ignored
        no_refund_hours: 0,
      };
      const startTime = hoursFromNow(12, now);
      const result = evaluateCancellationPolicy(mixedPolicy, startTime, 100, now);

      // Should use spec naming (10%) not legacy (50%)
      expect(result).toEqual({
        refundType: 'PARTIAL_REFUND',
        refundAmount: 90,
        fee: 10,
      });
    });
  });

  describe('DEFAULT_CANCELLATION_POLICY constant', () => {
    it('should have the expected default values', () => {
      expect(DEFAULT_CANCELLATION_POLICY).toEqual({
        free_cancellation_hours: 24,
        late_cancel_fee_type: 'percentage',
        late_cancel_fee_amount: 0,
        no_refund_hours: 0,
      });
    });
  });
});
