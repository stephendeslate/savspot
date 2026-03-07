import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../src/payments/payments.service';

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    paymentStateHistory: {
      create: vi.fn(),
    },
  };
}

function makeConfigService(overrides: Record<string, number> = {}) {
  const defaults: Record<string, number> = {
    referral_commission_percent: 20,
    referral_commission_cap_cents: 50000,
    'stripe.platformFeePercent': 1,
    ...overrides,
  };
  return {
    get: vi.fn((key: string, fallback: number) => defaults[key] ?? fallback),
  };
}

describe('PaymentsService — calculateReferralCommission', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof makePrisma>;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    prisma = makePrisma();
    configService = makeConfigService();
    service = new PaymentsService(
      prisma as never,
      configService as never,
      {} as never,
      {} as never,
    );
  });

  it('returns null for DIRECT source', async () => {
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'DIRECT', 10000,
    );
    expect(result).toBeNull();
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
  });

  it('returns null for WALK_IN source', async () => {
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'WALK_IN', 10000,
    );
    expect(result).toBeNull();
  });

  it('returns null for WIDGET source', async () => {
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'WIDGET', 10000,
    );
    expect(result).toBeNull();
  });

  it('returns commission for first REFERRAL booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null); // no prior booking
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10000,
    );
    // 20% of 10000 cents = 2000 cents
    expect(result).toBe(2000);
  });

  it('returns commission for first DIRECTORY booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'DIRECTORY', 5000,
    );
    // 20% of 5000 cents = 1000 cents
    expect(result).toBe(1000);
  });

  it('returns commission for first API booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'API', 8000,
    );
    expect(result).toBe(1600);
  });

  it('returns null for second REFERRAL booking (same client + tenant)', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'booking-old' });
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10000,
    );
    expect(result).toBeNull();
  });

  it('commission is capped at configured maximum', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    // 20% of $100,000 (10_000_000 cents) = $20,000 but cap is $500 (50000 cents)
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10_000_000,
    );
    expect(result).toBe(50000);
  });

  it('cancelled prior bookings do not block commission', async () => {
    // The query filters out CANCELLED, so if the only prior booking is cancelled,
    // findFirst returns null and commission is eligible
    prisma.booking.findFirst.mockResolvedValue(null);
    const result = await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10000,
    );
    expect(result).toBe(2000);
  });

  it('queries only platform-sourced, non-cancelled bookings', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    await service.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10000,
    );
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        clientId: 'client-1',
        source: { in: ['DIRECTORY', 'API', 'REFERRAL'] },
        status: { notIn: ['CANCELLED'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
  });

  it('uses custom commission config values', async () => {
    const customConfig = makeConfigService({
      referral_commission_percent: 10,
      referral_commission_cap_cents: 100000,
    });
    const customService = new PaymentsService(
      prisma as never,
      customConfig as never,
      {} as never,
      {} as never,
    );
    prisma.booking.findFirst.mockResolvedValue(null);

    const result = await customService.calculateReferralCommission(
      'tenant-1', 'client-1', 'REFERRAL', 10000,
    );
    // 10% of 10000 = 1000
    expect(result).toBe(1000);
  });
});
