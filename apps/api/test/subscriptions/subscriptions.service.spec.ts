import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';

const TENANT_ID = 'tenant-001';
const SUBSCRIPTION_ID = 'sub_abc123';

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        'stripe.secretKey': 'sk_test_fake',
        'app.webUrl': 'http://localhost:3000',
      };
      return map[key] ?? fallback;
    }),
  };
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const config = makeConfig();
    service = new SubscriptionsService(prisma as never, config as never);
  });

  describe('getPlans', () => {
    it('should return all three plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans[0]!.tier).toBe('FREE');
      expect(plans[1]!.tier).toBe('PREMIUM');
      expect(plans[2]!.tier).toBe('ENTERPRISE');
    });

    it('should include pricing for PREMIUM', () => {
      const plans = service.getPlans();
      const premium = plans.find((p) => p.tier === 'PREMIUM');
      expect(premium!.monthlyPrice).toBe(29);
      expect(premium!.annualMonthlyPrice).toBe(23);
    });

    it('should include pricing for ENTERPRISE', () => {
      const plans = service.getPlans();
      const enterprise = plans.find((p) => p.tier === 'ENTERPRISE');
      expect(enterprise!.monthlyPrice).toBe(79);
      expect(enterprise!.annualMonthlyPrice).toBe(63);
    });

    it('should set FREE plan pricing to zero', () => {
      const plans = service.getPlans();
      const free = plans.find((p) => p.tier === 'FREE');
      expect(free!.monthlyPrice).toBe(0);
      expect(free!.annualMonthlyPrice).toBe(0);
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return subscription details', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'PREMIUM',
        subscriptionProviderId: SUBSCRIPTION_ID,
        subscriptionStatus: 'ACTIVE',
        subscriptionCurrentPeriodEnd: new Date('2025-06-01T00:00:00Z'),
        subscriptionGracePeriodEnd: null,
      });

      const result = await service.getCurrentSubscription(TENANT_ID);
      expect(result.tier).toBe('PREMIUM');
      expect(result.status).toBe('ACTIVE');
      expect(result.providerId).toBe(SUBSCRIPTION_ID);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.getCurrentSubscription(TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.createCheckoutSession(TENANT_ID, 'PREMIUM', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already on the target tier', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Test Tenant',
        subscriptionTier: 'PREMIUM',
        subscriptionProviderId: SUBSCRIPTION_ID,
      });

      await expect(
        service.createCheckoutSession(TENANT_ID, 'PREMIUM', false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPortalSession', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.createPortalSession(TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no subscription', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionProviderId: null,
      });
      await expect(
        service.createPortalSession(TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEntitlements', () => {
    it('should return FREE tier entitlements', () => {
      const entitlements = service.getEntitlements('FREE');
      expect(entitlements.maxStaff).toBe(1);
      expect(entitlements.maxBookingsPerMonth).toBe(100);
      expect(entitlements.teamManagement).toBe(false);
      expect(entitlements.multiLocation).toBe(false);
    });

    it('should return PREMIUM tier entitlements', () => {
      const entitlements = service.getEntitlements('PREMIUM');
      expect(entitlements.maxStaff).toBe(5);
      expect(entitlements.maxBookingsPerMonth).toBe(Infinity);
      expect(entitlements.teamManagement).toBe(true);
      expect(entitlements.multiLocation).toBe(false);
      expect(entitlements.customTemplates).toBe(true);
    });

    it('should return ENTERPRISE tier entitlements', () => {
      const entitlements = service.getEntitlements('ENTERPRISE');
      expect(entitlements.maxStaff).toBe(15);
      expect(entitlements.teamManagement).toBe(true);
      expect(entitlements.multiLocation).toBe(true);
    });
  });

  describe('handleWebhook', () => {
    describe('invoice.payment_failed', () => {
      it('should set tenant to PAST_DUE with grace period', async () => {
        prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
        prisma.tenant.update.mockResolvedValue({});

        const event = {
          type: 'invoice.payment_failed' as const,
          data: {
            object: {
              subscription: SUBSCRIPTION_ID,
            },
          },
        };

        await service.handleWebhook(event as never);

        expect(prisma.tenant.update).toHaveBeenCalledWith({
          where: { id: TENANT_ID },
          data: expect.objectContaining({
            subscriptionStatus: 'PAST_DUE',
            subscriptionGracePeriodEnd: expect.any(Date),
          }),
        });

        const updateCall = prisma.tenant.update.mock.calls[0]![0] as {
          data: { subscriptionGracePeriodEnd: Date };
        };
        const gracePeriodEnd =
          updateCall.data.subscriptionGracePeriodEnd;
        const now = new Date();
        const diffDays =
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(2.9);
        expect(diffDays).toBeLessThan(3.1);
      });

      it('should skip if no tenant found for subscription', async () => {
        prisma.tenant.findFirst.mockResolvedValue(null);

        const event = {
          type: 'invoice.payment_failed' as const,
          data: {
            object: { subscription: 'sub_unknown' },
          },
        };

        await service.handleWebhook(event as never);
        expect(prisma.tenant.update).not.toHaveBeenCalled();
      });
    });

    describe('invoice.paid', () => {
      it('should set tenant to ACTIVE and clear grace period', async () => {
        prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
        prisma.tenant.update.mockResolvedValue({});

        const event = {
          type: 'invoice.paid' as const,
          data: {
            object: { subscription: SUBSCRIPTION_ID },
          },
        };

        await service.handleWebhook(event as never);

        expect(prisma.tenant.update).toHaveBeenCalledWith({
          where: { id: TENANT_ID },
          data: {
            subscriptionStatus: 'ACTIVE',
            subscriptionGracePeriodEnd: null,
          },
        });
      });
    });

    describe('customer.subscription.deleted', () => {
      it('should downgrade tenant to FREE and CANCELED', async () => {
        prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
        prisma.tenant.update.mockResolvedValue({});

        const event = {
          type: 'customer.subscription.deleted' as const,
          data: {
            object: { id: SUBSCRIPTION_ID },
          },
        };

        await service.handleWebhook(event as never);

        expect(prisma.tenant.update).toHaveBeenCalledWith({
          where: { id: TENANT_ID },
          data: {
            subscriptionTier: 'FREE',
            subscriptionStatus: 'CANCELED',
            subscriptionProviderId: null,
            subscriptionCurrentPeriodEnd: null,
            subscriptionGracePeriodEnd: null,
          },
        });
      });
    });

    describe('customer.subscription.updated', () => {
      it('should update tenant subscription details', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
        prisma.tenant.update.mockResolvedValue({});

        const event = {
          type: 'customer.subscription.updated' as const,
          data: {
            object: {
              id: SUBSCRIPTION_ID,
              status: 'active',
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
              metadata: {
                tenantId: TENANT_ID,
                tier: 'PREMIUM',
              },
            },
          },
        };

        await service.handleWebhook(event as never);

        expect(prisma.tenant.update).toHaveBeenCalledWith({
          where: { id: TENANT_ID },
          data: expect.objectContaining({
            subscriptionProviderId: SUBSCRIPTION_ID,
            subscriptionTier: 'PREMIUM',
            subscriptionStatus: 'ACTIVE',
            subscriptionGracePeriodEnd: null,
            subscriptionCurrentPeriodEnd: expect.any(Date),
          }),
        });
      });

      it('should fall back to finding tenant by subscriptionProviderId', async () => {
        prisma.tenant.findUnique.mockResolvedValue(null);
        prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
        prisma.tenant.update.mockResolvedValue({});

        const event = {
          type: 'customer.subscription.updated' as const,
          data: {
            object: {
              id: SUBSCRIPTION_ID,
              status: 'past_due',
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
              metadata: {},
            },
          },
        };

        await service.handleWebhook(event as never);

        expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
          where: { subscriptionProviderId: SUBSCRIPTION_ID },
          select: { id: true },
        });
        expect(prisma.tenant.update).toHaveBeenCalledWith({
          where: { id: TENANT_ID },
          data: expect.objectContaining({
            subscriptionStatus: 'PAST_DUE',
          }),
        });
      });
    });
  });
});
