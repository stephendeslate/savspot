import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_GDPR,
  QUEUE_PLATFORM_METRICS,
  QUEUE_AI_OPERATIONS,
  QUEUE_DIRECTORY,
  QUEUE_CUSTOM_DOMAINS,
  QUEUE_PARTNERS,
  JOB_EXPIRE_RESERVATIONS,
  JOB_ABANDONED_BOOKING_RECOVERY,
  JOB_PROCESS_COMPLETED_BOOKINGS,
  JOB_ENFORCE_APPROVAL_DEADLINES,
  JOB_SEND_PAYMENT_REMINDERS,
  JOB_ENFORCE_PAYMENT_DEADLINES,
  JOB_RETRY_FAILED_PAYMENTS,
  JOB_CALENDAR_TWO_WAY_SYNC,
  JOB_CALENDAR_TOKEN_REFRESH,
  JOB_PROCESS_POST_APPOINTMENT,
  JOB_SEND_BOOKING_REMINDERS,
  JOB_SEND_MORNING_SUMMARY,
  JOB_SEND_WEEKLY_DIGEST,
  JOB_PROCESS_HOURLY_DIGESTS,
  JOB_PROCESS_DAILY_DIGESTS,
  JOB_CLEANUP_RETENTION,
  JOB_PROCESS_ACCOUNT_DELETION,
  JOB_COMPUTE_NO_SHOW_RISK,
  JOB_COMPUTE_CLIENT_INSIGHTS,
  JOB_COMPUTE_DEMAND_ANALYSIS,
  JOB_COMPUTE_BENCHMARKS,
  JOB_COMPUTE_PLATFORM_METRICS,
  JOB_DIRECTORY_LISTING_REFRESH,
  JOB_DIRECTORY_SITEMAP_GENERATE,
  JOB_CUSTOM_DOMAIN_DNS_VERIFY,
  JOB_CUSTOM_DOMAIN_SSL_RENEW,
  JOB_CUSTOM_DOMAIN_HEALTH_CHECK,
  JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE,
  JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK,
  JOB_CALENDAR_SYNC_FALLBACK,
  JOB_RECOMMENDATION_SERVICE_AFFINITY,
  JOB_RECOMMENDATION_CLIENT_PREFERENCE,
  JOB_CHURN_RISK_COMPUTE,
  JOB_RECOMMENDATION_CLEANUP,
  JOB_PARTNER_PAYOUT_BATCH,
} from '../bullmq/queue.constants';

/**
 * One-shot Redis cleanup of stale BullMQ repeatable schedule entries.
 *
 * Phase 4 cleanup: every queue has been ported to Inngest. The
 * `schedules` array is now empty; on every worker boot we walk
 * `staleRepeatables` and delete the matching repeatable entries from
 * Redis so BullMQ stops continuing to fire them. After one boot in
 * each environment, this service can be deleted entirely (Phase 4
 * cleanup B).
 */
@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_BOOKINGS) private readonly bookingsQueue: Queue,
    @InjectQueue(QUEUE_PAYMENTS) private readonly paymentsQueue: Queue,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
    @InjectQueue(QUEUE_CALENDAR) private readonly calendarQueue: Queue,
    @InjectQueue(QUEUE_GDPR) private readonly gdprQueue: Queue,
    @InjectQueue(QUEUE_PLATFORM_METRICS) private readonly platformMetricsQueue: Queue,
    @InjectQueue(QUEUE_AI_OPERATIONS) private readonly aiOperationsQueue: Queue,
    @InjectQueue(QUEUE_DIRECTORY) private readonly directoryQueue: Queue,
    @InjectQueue(QUEUE_CUSTOM_DOMAINS) private readonly customDomainsQueue: Queue,
    @InjectQueue(QUEUE_PARTNERS) private readonly partnersQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // No active schedules — every queue is on Inngest as of Phase 4s.
    // The full set of previously-scheduled job names is enumerated in
    // staleRepeatables below so that any existing Redis repeatable
    // entries are removed on the next worker boot.
    const staleRepeatables: Array<{ queue: Queue; name: string }> = [
      // Bookings (Phase 4p)
      { queue: this.bookingsQueue, name: JOB_EXPIRE_RESERVATIONS },
      { queue: this.bookingsQueue, name: JOB_ABANDONED_BOOKING_RECOVERY },
      { queue: this.bookingsQueue, name: JOB_PROCESS_COMPLETED_BOOKINGS },
      { queue: this.bookingsQueue, name: JOB_ENFORCE_APPROVAL_DEADLINES },
      { queue: this.bookingsQueue, name: JOB_COMPUTE_NO_SHOW_RISK },
      { queue: this.bookingsQueue, name: JOB_COMPUTE_DEMAND_ANALYSIS },
      // Payments (Phase 4s)
      { queue: this.paymentsQueue, name: JOB_SEND_PAYMENT_REMINDERS },
      { queue: this.paymentsQueue, name: JOB_ENFORCE_PAYMENT_DEADLINES },
      { queue: this.paymentsQueue, name: JOB_RETRY_FAILED_PAYMENTS },
      // Calendar (Phase 4q)
      { queue: this.calendarQueue, name: JOB_CALENDAR_TWO_WAY_SYNC },
      { queue: this.calendarQueue, name: JOB_CALENDAR_TOKEN_REFRESH },
      { queue: this.calendarQueue, name: JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE },
      { queue: this.calendarQueue, name: JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK },
      { queue: this.calendarQueue, name: JOB_CALENDAR_SYNC_FALLBACK },
      // Communications (Phase 4r)
      { queue: this.commsQueue, name: JOB_PROCESS_POST_APPOINTMENT },
      { queue: this.commsQueue, name: JOB_SEND_BOOKING_REMINDERS },
      { queue: this.commsQueue, name: JOB_SEND_MORNING_SUMMARY },
      { queue: this.commsQueue, name: JOB_SEND_WEEKLY_DIGEST },
      { queue: this.commsQueue, name: JOB_PROCESS_HOURLY_DIGESTS },
      { queue: this.commsQueue, name: JOB_PROCESS_DAILY_DIGESTS },
      { queue: this.commsQueue, name: JOB_COMPUTE_CLIENT_INSIGHTS },
      // GDPR (Phase 4m)
      { queue: this.gdprQueue, name: JOB_CLEANUP_RETENTION },
      { queue: this.gdprQueue, name: JOB_PROCESS_ACCOUNT_DELETION },
      { queue: this.gdprQueue, name: JOB_COMPUTE_BENCHMARKS },
      // Directory (Phase 4e)
      { queue: this.directoryQueue, name: JOB_DIRECTORY_LISTING_REFRESH },
      { queue: this.directoryQueue, name: JOB_DIRECTORY_SITEMAP_GENERATE },
      // Partners (Phase 4f)
      { queue: this.partnersQueue, name: JOB_PARTNER_PAYOUT_BATCH },
      // Custom domains (Phase 4g)
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_DNS_VERIFY },
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_SSL_RENEW },
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_HEALTH_CHECK },
      // Platform metrics (Phase 4i)
      { queue: this.platformMetricsQueue, name: JOB_COMPUTE_PLATFORM_METRICS },
      // AI Operations recommendations (Phase 4o)
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_SERVICE_AFFINITY },
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_CLIENT_PREFERENCE },
      { queue: this.aiOperationsQueue, name: JOB_CHURN_RISK_COMPUTE },
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_CLEANUP },
    ];

    for (const { queue, name } of staleRepeatables) {
      try {
        const existing = await queue.getRepeatableJobs();
        for (const job of existing) {
          if (job.name === name) {
            await queue.removeRepeatableByKey(job.key);
            this.logger.log(`Removed stale repeatable: ${name} (${job.key})`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to clean stale repeatable ${name}: ${error}`);
      }
    }
  }
}
