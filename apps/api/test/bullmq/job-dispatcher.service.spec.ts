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

function makeInngest() {
  return {
    send: vi.fn().mockResolvedValue({ ids: ['evt-1'] }),
  };
}

function buildDispatcher(
  config: ReturnType<typeof makeConfig>,
  queueOverrides: Partial<Record<string, ReturnType<typeof makeQueue>>> = {},
  inngest?: ReturnType<typeof makeInngest>,
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
      inngest as never,
    ),
    queues,
    inngest,
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

    it('routes to Inngest when the per-queue flag is set to inngest', async () => {
      const inngest = makeInngest();
      const { dispatcher } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'inngest' }),
        {},
        inngest,
      );

      await dispatcher.dispatch(QUEUE_PAYMENTS, 'processRefund', {
        paymentId: 'p-1',
      });

      expect(inngest.send).toHaveBeenCalledWith([
        { name: 'payments/processRefund', data: { paymentId: 'p-1' } },
      ]);
    });

    it('translates BullMQ delay option into an Inngest ts (future timestamp)', async () => {
      const inngest = makeInngest();
      const { dispatcher } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'inngest' }),
        {},
        inngest,
      );

      const before = Date.now();
      await dispatcher.dispatch(
        QUEUE_PAYMENTS,
        'processRefund',
        { paymentId: 'p-1' },
        { delay: 60_000 },
      );
      const after = Date.now();

      const call = inngest.send.mock.calls[0]![0] as Array<{ ts: number }>;
      const ts = call[0]!.ts;
      expect(ts).toBeGreaterThanOrEqual(before + 60_000);
      expect(ts).toBeLessThanOrEqual(after + 60_000);
    });

    it('throws when inngest flag is set but no Inngest client is wired', async () => {
      const { dispatcher } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'inngest' }),
        // no inngest mock provided → constructor receives undefined
      );

      await expect(
        dispatcher.dispatch(QUEUE_PAYMENTS, 'processRefund', { paymentId: 'p-1' }),
      ).rejects.toThrow(/Inngest client is not available/);
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

    it('routes bulk dispatch to Inngest when the queue flag is set', async () => {
      const inngest = makeInngest();
      const { dispatcher } = buildDispatcher(
        makeConfig({ QUEUE_PAYMENTS_PROVIDER: 'inngest' }),
        {},
        inngest,
      );

      await dispatcher.dispatchBulk(QUEUE_PAYMENTS, [
        { name: 'a', data: { x: 1 } },
        { name: 'b', data: { x: 2 } },
      ]);

      expect(inngest.send).toHaveBeenCalledWith([
        { name: 'payments/a', data: { x: 1 } },
        { name: 'payments/b', data: { x: 2 } },
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
