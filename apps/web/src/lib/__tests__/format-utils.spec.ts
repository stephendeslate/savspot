import { describe, it, expect } from 'vitest';
import {
  getStatusColor,
  getSourceColor,
  getPaymentStatusColor,
  getInvoiceStatusColor,
  formatAmount,
  formatStatus,
  formatPaymentType,
} from '../format-utils';

describe('getStatusColor', () => {
  it.each([
    ['PENDING', 'bg-yellow-100 text-yellow-800'],
    ['CONFIRMED', 'bg-blue-100 text-blue-800'],
    ['IN_PROGRESS', 'bg-purple-100 text-purple-800'],
    ['COMPLETED', 'bg-green-100 text-green-800'],
    ['CANCELLED', 'bg-red-100 text-red-800'],
    ['NO_SHOW', 'bg-gray-100 text-gray-800'],
    ['SUCCEEDED', 'bg-green-100 text-green-800'],
    ['FAILED', 'bg-red-100 text-red-800'],
    ['REFUNDED', 'bg-gray-100 text-gray-800'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getStatusColor(status)).toBe(expected);
  });

  it('returns default gray classes for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
    expect(getStatusColor('')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getSourceColor', () => {
  it.each([
    ['WALK_IN', 'bg-orange-100 text-orange-800'],
    ['DIRECT', 'bg-blue-100 text-blue-800'],
    ['REFERRAL', 'bg-green-100 text-green-800'],
  ])('returns correct classes for %s', (source, expected) => {
    expect(getSourceColor(source)).toBe(expected);
  });

  it('returns default gray classes for unknown source', () => {
    expect(getSourceColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getPaymentStatusColor', () => {
  it.each([
    ['PAID', 'bg-green-100 text-green-800'],
    ['SUCCEEDED', 'bg-green-100 text-green-800'],
    ['COMPLETED', 'bg-green-100 text-green-800'],
    ['SENT', 'bg-blue-100 text-blue-800'],
    ['PENDING', 'bg-blue-100 text-blue-800'],
    ['PROCESSING', 'bg-yellow-100 text-yellow-800'],
    ['OVERDUE', 'bg-red-100 text-red-800'],
    ['FAILED', 'bg-red-100 text-red-800'],
    ['REFUNDED', 'bg-orange-100 text-orange-800'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getPaymentStatusColor(status)).toBe(expected);
  });

  it('returns default gray classes for unknown status', () => {
    expect(getPaymentStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('getInvoiceStatusColor', () => {
  it.each([
    ['PAID', 'bg-green-100 text-green-800'],
    ['SUCCEEDED', 'bg-green-100 text-green-800'],
    ['COMPLETED', 'bg-green-100 text-green-800'],
    ['SENT', 'bg-blue-100 text-blue-800'],
    ['PENDING', 'bg-blue-100 text-blue-800'],
    ['OVERDUE', 'bg-red-100 text-red-800'],
    ['DRAFT', 'bg-gray-100 text-gray-800'],
    ['REFUNDED', 'bg-orange-100 text-orange-800'],
    ['VOID', 'bg-gray-100 text-gray-800'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getInvoiceStatusColor(status)).toBe(expected);
  });

  it('returns default gray classes for unknown status', () => {
    expect(getInvoiceStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('formatAmount', () => {
  it('formats USD amounts correctly', () => {
    expect(formatAmount('100', 'USD')).toBe('$100.00');
    expect(formatAmount('99.99', 'USD')).toBe('$99.99');
    expect(formatAmount('0', 'USD')).toBe('$0.00');
  });

  it('formats EUR amounts correctly', () => {
    const result = formatAmount('50', 'EUR');
    // Intl may format as "€50.00" or "EUR 50.00" depending on locale
    expect(result).toContain('50.00');
  });

  it('formats GBP amounts correctly', () => {
    const result = formatAmount('25.50', 'GBP');
    expect(result).toContain('25.50');
  });

  it('formats large amounts with grouping', () => {
    expect(formatAmount('1234567.89', 'USD')).toBe('$1,234,567.89');
  });
});

describe('formatStatus', () => {
  it('replaces underscores with spaces', () => {
    expect(formatStatus('UPPER_SNAKE_CASE')).toBe('UPPER SNAKE CASE');
  });

  it('handles single word status', () => {
    expect(formatStatus('PENDING')).toBe('PENDING');
  });

  it('handles status with multiple underscores', () => {
    expect(formatStatus('A_B_C_D')).toBe('A B C D');
  });

  it('handles empty string', () => {
    expect(formatStatus('')).toBe('');
  });
});

describe('formatPaymentType', () => {
  it.each([
    ['DEPOSIT', 'Deposit'],
    ['FULL', 'Full'],
    ['REFUND', 'Refund'],
    ['PARTIAL', 'Partial'],
  ])('returns %s for %s', (type, expected) => {
    expect(formatPaymentType(type)).toBe(expected);
  });

  it('falls back to formatStatus for unknown types', () => {
    expect(formatPaymentType('SOME_OTHER')).toBe('SOME OTHER');
  });
});
