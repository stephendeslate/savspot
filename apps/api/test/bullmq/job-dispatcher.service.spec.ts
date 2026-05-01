import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobDispatcher } from '@/bullmq/job-dispatcher.service';
import {
  ALL_QUEUES,
  QUEUE_PAYMENTS,
  QUEUE_GDPR,
} from '@/bullmq/queue.constants';

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    addBulk: vi.fn().mockResolvedValue([]),
  };
}

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: string) =>
      overrides[key] ?? defaultValue,
    ),
  };
}

function buildDispatcher(
  config: ReturnType<typeof makeConfig>,
  queueOverrides: Partial<Record<string, ReturnType<typeof makeQueue>>> = {},
) {
  const queues = Object.fromEntries(
    ALL_QUEUES.map((name) => [name, queueOverrides[name] ?? makeQueue()]),
  );

  // Match the constructor signature in JobDispatcher; positional args mirror
  // the order queues are declared in queue.constants.
  return {
    dispatcher: new JobDispatcher(
      config as never,
      queues['bookings'] as never,
      queues['payments'] as never,
      queues['calendar'] as never,
      queues['communications'] as never,
      queues['invoices'] as never,
      queues['gdpr'] as never,
      queues['imports'] as never,
      queues['currency-refresh'] as never,
      queues['webhooks'] as never,
      queues['voice-calls'] as never,
      queues['accounting'] as never,
      queues['platform-metrics'] as never,
      queues['ai-operations'] as never,
      queues['directory'] as never,
      queues['custom-domains'] as never,
      queues['partners'] as never,
    ),
    queues,
  };
}

describe('JobDispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('dispatch', () => {
    it('routes to BullMQ when no flag is set (default)', async () => {
      const { dispatcher, queues } = buildDispatcher(makeConfig());

      await dispatcher.dispatch(QUEUE_PAYMENTS, 'processRefund', {
        paymentId: 'p-1',
      });

      expect(queues[QUEUE_PAYMENTS]?.add).toHaveBeenCalledWith(
        'processRefund',
        { paymentId: 'p-1' },
        undefined,
      );
    });

    it('passes job options through to BullMQ', async () => {
      const { dispatcher, queues } = buildDispatcher(makeConfig());

      await dispatcher.dispatch(
        QUEUE_GDPR,
        'cleanupRetention',
        { tenantId: 't-1' },
        { delay: 60_000, attempts: 5 },
      );

      expect(queues[QUEUE_GDPR]?.add).toHaveBeenCalledWith(
        'cleanupRetention',
        { tenantId: 't-1' },
        { delay: 60_000, attempts: 5 },
      );
    });

    it('throws when an unknown queue is dispatched', async () => {
      const { dispatcher } = buildDispatcher(makeConfig());

      await expect(
        dispatcher.dispatch('not-a-queue', 'job', {}),
      ).rejects.toThrow(/Unknown queue/);
    });

    it('rejects when the per-queue flag is set to inngest (Phase 4c+ only)', async () => {
      const { dispatcher } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'inngest' }),
      );

      await expect(
        dispatcher.dispatch(QUEUE_PAYMENTS, 'processRefund', { paymentId: 'p-1' }),
      ).rejects.toThrow(/Inngest backend.*not yet implemented/);
    });

    it('treats unknown flag values as bullmq', async () => {
      const { dispatcher, queues } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'something-else' }),
      );

      await dispatcher.dispatch(QUEUE_PAYMENTS, 'processRefund', {
        paymentId: 'p-1',
      });

      expect(queues[QUEUE_PAYMENTS]?.add).toHaveBeenCalled();
    });
  });

  describe('dispatchBulk', () => {
    it('routes bulk dispatch to BullMQ addBulk', async () => {
      const { dispatcher, queues } = buildDispatcher(makeConfig());

      await dispatcher.dispatchBulk(QUEUE_PAYMENTS, [
        { name: 'a', data: { x: 1 } },
        { name: 'b', data: { x: 2 } },
      ]);

      expect(queues[QUEUE_PAYMENTS]?.addBulk).toHaveBeenCalledWith([
        { name: 'a', data: { x: 1 } },
        { name: 'b', data: { x: 2 } },
      ]);
    });
  });

  describe('providerFor', () => {
    it('handles hyphenated queue names by uppercasing + underscoring', () => {
      const { dispatcher } = buildDispatcher(
        makeConfig({ 'QUEUE_CURRENCY_REFRESH_PROVIDER': 'inngest' }),
      );

      expect(dispatcher.providerFor('currency-refresh')).toBe('inngest');
    });

    it('defaults to bullmq', () => {
      const { dispatcher } = buildDispatcher(makeConfig());

      expect(dispatcher.providerFor(QUEUE_PAYMENTS)).toBe('bullmq');
    });
  });
});
