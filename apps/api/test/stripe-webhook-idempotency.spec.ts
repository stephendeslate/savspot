import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StripeWebhookController } from '@/payments/stripe-webhook.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    paymentWebhookLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfigService() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'stripe.webhookSecret') return 'whsec_test';
      if (key === 'stripe.connectWebhookSecret') return undefined;
      return undefined;
    }),
  };
}

function makeStripeProvider(event: unknown) {
  return {
    constructWebhookEvent: vi.fn().mockReturnValue(event),
  };
}

const fakeEvent = {
  id: 'evt_test_123',
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_abc' } },
};

const fakeRequest = {
  rawBody: Buffer.from('raw-body'),
} as unknown as import('express').Request;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StripeWebhookController — idempotency', () => {
  let controller: StripeWebhookController;
  let prisma: ReturnType<typeof makePrisma>;
  let paymentsService: { handlePaymentSuccess: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = makePrisma();
    paymentsService = {
      handlePaymentSuccess: vi.fn().mockResolvedValue(undefined),
    };

    controller = new StripeWebhookController(
      makeConfigService() as never,
      prisma as never,
      paymentsService as never,
      {} as never, // StripeConnectService — not exercised
      makeStripeProvider(fakeEvent) as never,
    );
  });

  it('should process a new webhook event', async () => {
    prisma.paymentWebhookLog.findUnique.mockResolvedValue(null);
    prisma.paymentWebhookLog.create.mockResolvedValue({
      id: 'log-1',
      eventId: fakeEvent.id,
      processed: false,
    });
    prisma.paymentWebhookLog.update.mockResolvedValue({
      id: 'log-1',
      processed: true,
    });

    const result = await controller.handleWebhook(fakeRequest, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(prisma.paymentWebhookLog.findUnique).toHaveBeenCalledWith({
      where: { eventId: 'evt_test_123' },
    });
    expect(prisma.paymentWebhookLog.create).toHaveBeenCalled();
    expect(paymentsService.handlePaymentSuccess).toHaveBeenCalledWith('pi_abc');
    expect(prisma.paymentWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { processed: true },
    });
  });

  it('should skip processing when a duplicate event is received', async () => {
    prisma.paymentWebhookLog.findUnique.mockResolvedValue({
      id: 'log-existing',
      eventId: fakeEvent.id,
      processed: true,
    });

    const result = await controller.handleWebhook(fakeRequest, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(prisma.paymentWebhookLog.findUnique).toHaveBeenCalledWith({
      where: { eventId: 'evt_test_123' },
    });
    // Should NOT create a new log or process the event
    expect(prisma.paymentWebhookLog.create).not.toHaveBeenCalled();
    expect(paymentsService.handlePaymentSuccess).not.toHaveBeenCalled();
    expect(prisma.paymentWebhookLog.update).not.toHaveBeenCalled();
  });

  it('should return early without routing when event already exists even if previously errored', async () => {
    prisma.paymentWebhookLog.findUnique.mockResolvedValue({
      id: 'log-existing',
      eventId: fakeEvent.id,
      processed: false,
      processingError: 'previous error',
    });

    const result = await controller.handleWebhook(fakeRequest, 'sig_test');

    expect(result).toEqual({ received: true });
    // Even if the previous attempt had an error, we still skip re-processing
    // (retries should be handled by a separate retry mechanism, not Stripe re-delivery)
    expect(prisma.paymentWebhookLog.create).not.toHaveBeenCalled();
    expect(paymentsService.handlePaymentSuccess).not.toHaveBeenCalled();
  });
});
