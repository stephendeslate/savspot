import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StripeWebhookController } from '@/payments/stripe-webhook.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    paymentWebhookLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    webhookDeadLetter: {
      create: vi.fn(),
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
    expect(prisma.paymentWebhookLog.create).toHaveBeenCalled();
    expect(paymentsService.handlePaymentSuccess).toHaveBeenCalledWith('pi_abc');
    expect(prisma.paymentWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { processed: true },
    });
  });

  it('should skip processing when a duplicate event is received (P2002 on insert)', async () => {
    // Simulate unique-constraint race: the log row for this event already
    // exists. The insert throws P2002 and the controller short-circuits
    // without invoking handlers or creating a dead letter entry.
    const p2002 = Object.assign(
      new Error('Unique constraint failed on the fields: (`event_id`)'),
      { code: 'P2002' },
    );
    prisma.paymentWebhookLog.create.mockRejectedValue(p2002);

    const result = await controller.handleWebhook(fakeRequest, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(prisma.paymentWebhookLog.create).toHaveBeenCalledTimes(1);
    expect(paymentsService.handlePaymentSuccess).not.toHaveBeenCalled();
    expect(prisma.paymentWebhookLog.update).not.toHaveBeenCalled();
    // CRITICAL: a duplicate must NOT be recorded as a dead letter.
    expect(prisma.webhookDeadLetter.create).not.toHaveBeenCalled();
  });

  it('should rethrow non-P2002 errors from the log insert', async () => {
    // A generic DB error (not a unique-constraint collision) must propagate
    // so Stripe retries and we don't silently drop the event.
    const otherError = new Error('connection refused');
    prisma.paymentWebhookLog.create.mockRejectedValue(otherError);

    await expect(
      controller.handleWebhook(fakeRequest, 'sig_test'),
    ).rejects.toThrow('connection refused');
    expect(paymentsService.handlePaymentSuccess).not.toHaveBeenCalled();
  });
});
