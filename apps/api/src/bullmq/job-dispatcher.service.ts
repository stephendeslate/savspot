import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import type { Inngest } from 'inngest';
import {
  ALL_QUEUES,
  QUEUE_ACCOUNTING,
  QUEUE_AI_OPERATIONS,
  QUEUE_BOOKINGS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_CURRENCY_REFRESH,
  QUEUE_CUSTOM_DOMAINS,
  QUEUE_DIRECTORY,
  QUEUE_GDPR,
  QUEUE_IMPORTS,
  QUEUE_INVOICES,
  QUEUE_PARTNERS,
  QUEUE_PAYMENTS,
  QUEUE_PLATFORM_METRICS,
  QUEUE_VOICE_CALLS,
  QUEUE_WEBHOOKS,
} from './queue.constants';

export type QueueProvider = 'bullmq' | 'inngest';

/**
 * Single dispatch entry point for all background work.
 *
 * Producer code calls `dispatcher.dispatch(queueName, jobName, data, opts?)`
 * instead of directly using `@InjectQueue + queue.add()`. Internally, this
 * service inspects a per-queue feature flag (`QUEUE_<NAME>_PROVIDER`) to
 * route to either BullMQ (the current backend) or Inngest (post Phase 4c
 * cutover, per queue).
 *
 * Phase 4b: only the BullMQ backend is wired. The Inngest branch throws
 * intentionally — the flag stays set to `bullmq` everywhere until per-queue
 * cutover PRs in Phase 4c onward.
 *
 * The flag is read from env at dispatch time (not cached). This keeps
 * cutover reversible per queue without restarting the api: setting
 * `QUEUE_PAYMENTS_PROVIDER=bullmq` after a Supabase secret update routes new
 * dispatches back to BullMQ. (Practically a Fly secret change still triggers
 * a rolling redeploy, so the runtime-read isn't the rollback mechanism, but
 * it does mean tests can override per-test without DI surgery.)
 */
@Injectable()
export class JobDispatcher {
  private readonly logger = new Logger(JobDispatcher.name);
  private readonly queues: Record<string, Queue>;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_BOOKINGS) bookingsQueue: Queue,
    @InjectQueue(QUEUE_PAYMENTS) paymentsQueue: Queue,
    @InjectQueue(QUEUE_CALENDAR) calendarQueue: Queue,
    @InjectQueue(QUEUE_COMMUNICATIONS) communicationsQueue: Queue,
    @InjectQueue(QUEUE_INVOICES) invoicesQueue: Queue,
    @InjectQueue(QUEUE_GDPR) gdprQueue: Queue,
    @InjectQueue(QUEUE_IMPORTS) importsQueue: Queue,
    @InjectQueue(QUEUE_CURRENCY_REFRESH) currencyRefreshQueue: Queue,
    @InjectQueue(QUEUE_WEBHOOKS) webhooksQueue: Queue,
    @InjectQueue(QUEUE_VOICE_CALLS) voiceCallsQueue: Queue,
    @InjectQueue(QUEUE_ACCOUNTING) accountingQueue: Queue,
    @InjectQueue(QUEUE_PLATFORM_METRICS) platformMetricsQueue: Queue,
    @InjectQueue(QUEUE_AI_OPERATIONS) aiOperationsQueue: Queue,
    @InjectQueue(QUEUE_DIRECTORY) directoryQueue: Queue,
    @InjectQueue(QUEUE_CUSTOM_DOMAINS) customDomainsQueue: Queue,
    @InjectQueue(QUEUE_PARTNERS) partnersQueue: Queue,
    @Optional() @Inject('INNGEST_CLIENT') private readonly inngestClient?: Inngest,
  ) {
    this.queues = {
      [QUEUE_BOOKINGS]: bookingsQueue,
      [QUEUE_PAYMENTS]: paymentsQueue,
      [QUEUE_CALENDAR]: calendarQueue,
      [QUEUE_COMMUNICATIONS]: communicationsQueue,
      [QUEUE_INVOICES]: invoicesQueue,
      [QUEUE_GDPR]: gdprQueue,
      [QUEUE_IMPORTS]: importsQueue,
      [QUEUE_CURRENCY_REFRESH]: currencyRefreshQueue,
      [QUEUE_WEBHOOKS]: webhooksQueue,
      [QUEUE_VOICE_CALLS]: voiceCallsQueue,
      [QUEUE_ACCOUNTING]: accountingQueue,
      [QUEUE_PLATFORM_METRICS]: platformMetricsQueue,
      [QUEUE_AI_OPERATIONS]: aiOperationsQueue,
      [QUEUE_DIRECTORY]: directoryQueue,
      [QUEUE_CUSTOM_DOMAINS]: customDomainsQueue,
      [QUEUE_PARTNERS]: partnersQueue,
    };
  }

  /**
   * Enqueue work for the given queue + job name. Routes to BullMQ or Inngest
   * based on the per-queue env flag. Same call shape regardless of backend.
   */
  async dispatch<TPayload extends object>(
    queueName: string,
    jobName: string,
    data: TPayload,
    options?: JobsOptions,
  ): Promise<void> {
    const provider = this.providerFor(queueName);
    if (provider === 'inngest') {
      await this.dispatchToInngest(queueName, jobName, data, options);
      return;
    }
    const queue = this.queueOrThrow(queueName);
    await queue.add(jobName, data, options);
  }

  /**
   * Bulk variant for enqueueing many jobs onto the same queue at once.
   * Mirrors BullMQ's `addBulk`. Used by digest-fanout and sweep processors.
   */
  async dispatchBulk<TPayload extends object>(
    queueName: string,
    jobs: Array<{ name: string; data: TPayload; opts?: JobsOptions }>,
  ): Promise<void> {
    const provider = this.providerFor(queueName);
    if (provider === 'inngest') {
      // Inngest's send() accepts an array — one round trip for the whole bulk.
      const events = jobs.map((j) => this.toEvent(queueName, j.name, j.data, j.opts));
      await this.inngestSendOrThrow(queueName, events);
      return;
    }
    const queue = this.queueOrThrow(queueName);
    await queue.addBulk(jobs);
  }

  /**
   * Inspect which provider is currently configured for a queue. Useful for
   * tests + diagnostic logging. Defaults to `bullmq` when unset.
   */
  providerFor(queueName: string): QueueProvider {
    const envKey = `QUEUE_${this.envSuffix(queueName)}_PROVIDER`;
    const value = this.configService.get<string>(envKey, 'bullmq');
    return value === 'inngest' ? 'inngest' : 'bullmq';
  }

  /**
   * Returns the underlying BullMQ Queue instance — used by code that needs
   * BullMQ-specific APIs (repeatable schedules, queue introspection). Avoid
   * for new producer code; prefer `dispatch()` so the backend is swappable.
   */
  getBullQueue(queueName: string): Queue {
    return this.queueOrThrow(queueName);
  }

  private queueOrThrow(queueName: string): Queue {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(
        `Unknown queue "${queueName}". Known queues: ${ALL_QUEUES.join(', ')}.`,
      );
    }
    return queue;
  }

  private envSuffix(queueName: string): string {
    return queueName.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Map (queue, jobName, data, options) → Inngest event payload.
   *
   * Event name convention: `${queue}/${jobName}` so each BullMQ pair produces
   * a stable, predictable Inngest event name. The payload is the BullMQ job
   * data verbatim; processors that previously read `job.data` now read
   * `event.data` inside their Inngest function — same shape.
   *
   * BullMQ options that have an Inngest equivalent are translated:
   *   - delay  → ts (absolute future timestamp)
   * Options without an Inngest equivalent (attempts, backoff, repeat) are
   * controlled at function-definition time on the Inngest side; passing them
   * through dispatch is a no-op.
   */
  private toEvent(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: JobsOptions,
  ): { name: string; data: unknown; ts?: number } {
    const event: { name: string; data: unknown; ts?: number } = {
      name: `${queueName}/${jobName}`,
      data,
    };
    if (options?.delay && Number.isFinite(options.delay)) {
      event.ts = Date.now() + Number(options.delay);
    }
    return event;
  }

  private async dispatchToInngest(
    queueName: string,
    jobName: string,
    data: unknown,
    options: JobsOptions | undefined,
  ): Promise<void> {
    const event = this.toEvent(queueName, jobName, data, options);
    await this.inngestSendOrThrow(queueName, [event]);
  }

  private async inngestSendOrThrow(
    queueName: string,
    events: Array<{ name: string; data: unknown; ts?: number }>,
  ): Promise<void> {
    if (!this.inngestClient) {
      throw new Error(
        `Inngest client is not available — set QUEUE_${this.envSuffix(queueName)}_PROVIDER=bullmq or wire up INNGEST_CLIENT.`,
      );
    }
    // The Inngest SDK accepts a single event or an array; we always pass an array
    // so the call shape stays identical for dispatch() and dispatchBulk().
    await this.inngestClient.send(events as never);
    this.logger.debug(
      `Dispatched ${events.length} event(s) to Inngest for queue "${queueName}"`,
    );
  }
}
