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
    ['PENDING', 'bg-status-pending text-status-pending-foreground'],
    ['CONFIRMED', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['IN_PROGRESS', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['COMPLETED', 'bg-status-completed text-status-completed-foreground'],
    ['CANCELLED', 'bg-status-cancelled text-status-cancelled-foreground'],
    ['NO_SHOW', 'bg-status-neutral text-status-neutral-foreground'],
    ['SUCCEEDED', 'bg-status-completed text-status-completed-foreground'],
    ['FAILED', 'bg-status-error text-status-error-foreground'],
    ['REFUNDED', 'bg-status-neutral text-status-neutral-foreground'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getStatusColor(status)).toBe(expected);
  });

  it('returns default neutral classes for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('bg-status-neutral text-status-neutral-foreground');
    expect(getStatusColor('')).toBe('bg-status-neutral text-status-neutral-foreground');
  });
});

describe('getSourceColor', () => {
  it.each([
    ['WALK_IN', 'bg-status-pending text-status-pending-foreground'],
    ['DIRECT', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['REFERRAL', 'bg-status-completed text-status-completed-foreground'],
  ])('returns correct classes for %s', (source, expected) => {
    expect(getSourceColor(source)).toBe(expected);
  });

  it('returns default neutral classes for unknown source', () => {
    expect(getSourceColor('UNKNOWN')).toBe('bg-status-neutral text-status-neutral-foreground');
  });
});

describe('getPaymentStatusColor', () => {
  it.each([
    ['PAID', 'bg-status-completed text-status-completed-foreground'],
    ['SUCCEEDED', 'bg-status-completed text-status-completed-foreground'],
    ['COMPLETED', 'bg-status-completed text-status-completed-foreground'],
    ['SENT', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['PENDING', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['PROCESSING', 'bg-status-pending text-status-pending-foreground'],
    ['OVERDUE', 'bg-status-error text-status-error-foreground'],
    ['FAILED', 'bg-status-error text-status-error-foreground'],
    ['REFUNDED', 'bg-status-pending text-status-pending-foreground'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getPaymentStatusColor(status)).toBe(expected);
  });

  it('returns default neutral classes for unknown status', () => {
    expect(getPaymentStatusColor('UNKNOWN')).toBe('bg-status-neutral text-status-neutral-foreground');
  });
});

describe('getInvoiceStatusColor', () => {
  it.each([
    ['PAID', 'bg-status-completed text-status-completed-foreground'],
    ['SUCCEEDED', 'bg-status-completed text-status-completed-foreground'],
    ['COMPLETED', 'bg-status-completed text-status-completed-foreground'],
    ['SENT', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['PENDING', 'bg-status-confirmed text-status-confirmed-foreground'],
    ['OVERDUE', 'bg-status-error text-status-error-foreground'],
    ['DRAFT', 'bg-status-neutral text-status-neutral-foreground'],
    ['REFUNDED', 'bg-status-pending text-status-pending-foreground'],
    ['VOID', 'bg-status-cancelled text-status-cancelled-foreground'],
  ])('returns correct classes for %s', (status, expected) => {
    expect(getInvoiceStatusColor(status)).toBe(expected);
  });

  it('returns default neutral classes for unknown status', () => {
    expect(getInvoiceStatusColor('UNKNOWN')).toBe('bg-status-neutral text-status-neutral-foreground');
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
  it('converts UPPER_SNAKE_CASE to Title Case', () => {
    expect(formatStatus('UPPER_SNAKE_CASE')).toBe('Upper Snake Case');
  });

  it('handles single word status', () => {
    expect(formatStatus('PENDING')).toBe('Pending');
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
    expect(formatPaymentType('SOME_OTHER')).toBe('Some Other');
  });
});
