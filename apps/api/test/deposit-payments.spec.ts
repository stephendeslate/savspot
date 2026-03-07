import { describe, it, expect } from 'vitest';
import { PaymentsService } from '../src/payments/payments.service';

// Test resolvePaymentAmount as a pure function — no mocks needed
function getService(): PaymentsService {
  return new PaymentsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('PaymentsService — resolvePaymentAmount', () => {
  const service = getService();

  it('returns FULL_PAYMENT when depositConfig is null', () => {
    const result = service.resolvePaymentAmount(100, null);
    expect(result).toEqual({ paymentType: 'FULL_PAYMENT', amount: 100 });
  });

  it('calculates PERCENTAGE deposit correctly (50% of $100 = $50)', () => {
    const result = service.resolvePaymentAmount(100, {
      type: 'PERCENTAGE',
      amount: 50,
    });
    expect(result).toEqual({ paymentType: 'DEPOSIT', amount: 50 });
  });

  it('calculates PERCENTAGE deposit correctly (25% of $200 = $50)', () => {
    const result = service.resolvePaymentAmount(200, {
      type: 'PERCENTAGE',
      amount: 25,
    });
    expect(result).toEqual({ paymentType: 'DEPOSIT', amount: 50 });
  });

  it('calculates FIXED deposit correctly ($30 on $100 booking)', () => {
    const result = service.resolvePaymentAmount(100, {
      type: 'FIXED',
      amount: 30,
    });
    expect(result).toEqual({ paymentType: 'DEPOSIT', amount: 30 });
  });

  it('caps FIXED deposit at total amount', () => {
    const result = service.resolvePaymentAmount(50, {
      type: 'FIXED',
      amount: 100,
    });
    expect(result).toEqual({ paymentType: 'FULL_PAYMENT', amount: 50 });
  });

  it('returns FULL_PAYMENT when PERCENTAGE is 100%', () => {
    const result = service.resolvePaymentAmount(100, {
      type: 'PERCENTAGE',
      amount: 100,
    });
    expect(result).toEqual({ paymentType: 'FULL_PAYMENT', amount: 100 });
  });

  it('returns FULL_PAYMENT when PERCENTAGE is 0%', () => {
    const result = service.resolvePaymentAmount(100, {
      type: 'PERCENTAGE',
      amount: 0,
    });
    expect(result).toEqual({ paymentType: 'FULL_PAYMENT', amount: 100 });
  });

  it('handles fractional amounts with proper rounding', () => {
    // 33% of $99.99 = $33.00 (rounded to 2 decimal places)
    const result = service.resolvePaymentAmount(99.99, {
      type: 'PERCENTAGE',
      amount: 33,
    });
    expect(result.paymentType).toBe('DEPOSIT');
    // Should be a reasonable value, not floating point noise
    expect(result.amount).toBeCloseTo(33, 1);
  });

  it('returns FULL_PAYMENT when FIXED deposit equals total', () => {
    const result = service.resolvePaymentAmount(100, {
      type: 'FIXED',
      amount: 100,
    });
    expect(result).toEqual({ paymentType: 'FULL_PAYMENT', amount: 100 });
  });
});
