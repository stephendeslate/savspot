import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsController } from '@/subscriptions/subscriptions.controller';
import { TIER_FEATURES } from '@/subscriptions/entitlements';

const TENANT_ID = 'tenant-001';

function makeService() {
  return {
    getPlans: vi.fn(),
    getCurrentSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    getEntitlements: vi.fn(),
    handleWebhook: vi.fn(),
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        'stripe.webhookSecret': 'whsec_test',
      };
      return map[key] ?? fallback;
    }),
  };
}

function makePrisma() {
  return {
    paymentWebhookLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    webhookDeadLetter: {
      create: vi.fn(),
    },
  };
}

function makeStripeProvider() {
  return {
    constructWebhookEvent: vi.fn(),
  };
}

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    const config = makeConfig();
    const prisma = makePrisma();
    const stripeProvider = makeStripeProvider();
    controller = new SubscriptionsController(
      service as never,
      config as never,
      prisma as never,
      stripeProvider as never,
    );
  });

  describe('getPlans', () => {
    it('should return plans from service', () => {
      const plans = [
        { tier: 'FREE', monthlyPrice: 0 },
        { tier: 'PREMIUM', monthlyPrice: 29 },
      ];
      service.getPlans.mockReturnValue(plans);

      const result = controller.getPlans();
      expect(result).toEqual(plans);
      expect(service.getPlans).toHaveBeenCalled();
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return current subscription', async () => {
      const sub = { tier: 'PREMIUM', status: 'ACTIVE' };
      service.getCurrentSubscription.mockResolvedValue(sub);

      const result = await controller.getCurrentSubscription(TENANT_ID);
      expect(result).toEqual(sub);
      expect(service.getCurrentSubscription).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const sessionResult = { sessionId: 'cs_test', url: 'https://checkout.stripe.com/test' };
      service.createCheckoutSession.mockResolvedValue(sessionResult);

      const result = await controller.createCheckoutSession(TENANT_ID, {
        tier: 'PREMIUM',
        isAnnual: false,
      });

      expect(result).toEqual(sessionResult);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        TENANT_ID,
        'PREMIUM',
        false,
      );
    });
  });

  describe('createPortalSession', () => {
    it('should create portal session', async () => {
      const portalResult = { url: 'https://billing.stripe.com/test' };
      service.createPortalSession.mockResolvedValue(portalResult);

      const result = await controller.createPortalSession(TENANT_ID);
      expect(result).toEqual(portalResult);
      expect(service.createPortalSession).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('getEntitlements', () => {
    it('should return entitlements for current tier', async () => {
      service.getCurrentSubscription.mockResolvedValue({
        tier: 'PREMIUM',
        status: 'ACTIVE',
      });
      service.getEntitlements.mockReturnValue(TIER_FEATURES.PREMIUM);

      const result = await controller.getEntitlements(TENANT_ID);
      expect(result).toEqual(TIER_FEATURES.PREMIUM);
      expect(service.getEntitlements).toHaveBeenCalledWith('PREMIUM');
    });
  });
});
