/**
 * Mock for ../../../../prisma/generated/prisma/runtime/library
 *
 * Provides Decimal and other runtime exports used by services.
 */

export class Decimal {
  private value: number;

  constructor(value: string | number | Decimal) {
    this.value = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber();
  }

  toNumber(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }

  toFixed(dp: number): string {
    return this.value.toFixed(dp);
  }

  static add(a: Decimal, b: Decimal): Decimal {
    return new Decimal(a.toNumber() + b.toNumber());
  }

  static mul(a: Decimal, b: Decimal): Decimal {
    return new Decimal(a.toNumber() * b.toNumber());
  }
}
