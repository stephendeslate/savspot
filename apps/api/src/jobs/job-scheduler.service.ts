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
  CRON_EVERY_5_MIN,
  CRON_EVERY_15_MIN,
  CRON_EVERY_30_MIN,
  CRON_EVERY_6_HOURS,
  CRON_HOURLY,
  CRON_DAILY_3AM_UTC,
  CRON_DAILY_4AM_UTC,
  CRON_DAILY_5AM_UTC,
  CRON_DAILY_6AM_UTC,
  CRON_DAILY_8AM_UTC,
  CRON_MONDAY_8AM_UTC,
  CRON_SUNDAY_2AM_UTC,
  CRON_FIRST_OF_MONTH,
} from '../bullmq/queue.constants';

/**
 * Centralized service that registers all repeatable BullMQ job schedules.
 * BullMQ deduplicates by repeat key — safe to call on every application boot.
 *
 * Separation of concerns:
 * - This service: Owns schedule registration (when jobs run)
 * - Processor classes: Own job execution logic (what jobs do)
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
    const defaultOpts = { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } };

    const schedules: Array<{ queue: Queue; name: string; pattern: string }> = [
      // Booking queue
      { queue: this.bookingsQueue, name: JOB_EXPIRE_RESERVATIONS, pattern: CRON_EVERY_5_MIN },
      { queue: this.bookingsQueue, name: JOB_ABANDONED_BOOKING_RECOVERY, pattern: CRON_EVERY_15_MIN },
      { queue: this.bookingsQueue, name: JOB_PROCESS_COMPLETED_BOOKINGS, pattern: CRON_HOURLY },
      { queue: this.bookingsQueue, name: JOB_ENFORCE_APPROVAL_DEADLINES, pattern: CRON_EVERY_15_MIN },
      // Payment queue
      { queue: this.paymentsQueue, name: JOB_SEND_PAYMENT_REMINDERS, pattern: CRON_EVERY_15_MIN },
      { queue: this.paymentsQueue, name: JOB_ENFORCE_PAYMENT_DEADLINES, pattern: CRON_DAILY_6AM_UTC },
      { queue: this.paymentsQueue, name: JOB_RETRY_FAILED_PAYMENTS, pattern: CRON_EVERY_30_MIN },
      // Calendar queue
      { queue: this.calendarQueue, name: JOB_CALENDAR_TWO_WAY_SYNC, pattern: CRON_EVERY_15_MIN },
      { queue: this.calendarQueue, name: JOB_CALENDAR_TOKEN_REFRESH, pattern: CRON_HOURLY },
      // Communications queue
      { queue: this.commsQueue, name: JOB_SEND_BOOKING_REMINDERS, pattern: CRON_EVERY_15_MIN },
      { queue: this.commsQueue, name: JOB_PROCESS_POST_APPOINTMENT, pattern: CRON_EVERY_15_MIN },
      { queue: this.commsQueue, name: JOB_SEND_MORNING_SUMMARY, pattern: CRON_DAILY_6AM_UTC },
      { queue: this.commsQueue, name: JOB_SEND_WEEKLY_DIGEST, pattern: CRON_MONDAY_8AM_UTC },
      { queue: this.commsQueue, name: JOB_PROCESS_HOURLY_DIGESTS, pattern: CRON_HOURLY },
      { queue: this.commsQueue, name: JOB_PROCESS_DAILY_DIGESTS, pattern: CRON_DAILY_8AM_UTC },
      // GDPR queue
      { queue: this.gdprQueue, name: JOB_CLEANUP_RETENTION, pattern: CRON_DAILY_3AM_UTC },
      { queue: this.gdprQueue, name: JOB_PROCESS_ACCOUNT_DELETION, pattern: CRON_DAILY_5AM_UTC },
      { queue: this.gdprQueue, name: JOB_COMPUTE_BENCHMARKS, pattern: CRON_DAILY_5AM_UTC },
      // AI Operations — bookings queue
      { queue: this.bookingsQueue, name: JOB_COMPUTE_NO_SHOW_RISK, pattern: CRON_DAILY_4AM_UTC },
      { queue: this.bookingsQueue, name: JOB_COMPUTE_DEMAND_ANALYSIS, pattern: CRON_SUNDAY_2AM_UTC },
      // AI Operations — communications queue
      { queue: this.commsQueue, name: JOB_COMPUTE_CLIENT_INSIGHTS, pattern: CRON_DAILY_3AM_UTC },
      // Platform Metrics queue
      { queue: this.platformMetricsQueue, name: JOB_COMPUTE_PLATFORM_METRICS, pattern: CRON_DAILY_3AM_UTC },
      // Directory queue
      { queue: this.directoryQueue, name: JOB_DIRECTORY_LISTING_REFRESH, pattern: CRON_DAILY_5AM_UTC },
      { queue: this.directoryQueue, name: JOB_DIRECTORY_SITEMAP_GENERATE, pattern: CRON_DAILY_6AM_UTC },
      // Custom Domains queue
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_DNS_VERIFY, pattern: CRON_EVERY_15_MIN },
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_SSL_RENEW, pattern: CRON_DAILY_4AM_UTC },
      { queue: this.customDomainsQueue, name: JOB_CUSTOM_DOMAIN_HEALTH_CHECK, pattern: CRON_EVERY_6_HOURS },
      // Calendar queue — Phase 4 additions
      { queue: this.calendarQueue, name: JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE, pattern: CRON_DAILY_3AM_UTC },
      { queue: this.calendarQueue, name: JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK, pattern: CRON_DAILY_3AM_UTC },
      { queue: this.calendarQueue, name: JOB_CALENDAR_SYNC_FALLBACK, pattern: CRON_EVERY_30_MIN },
      // AI Operations queue — recommendations
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_SERVICE_AFFINITY, pattern: CRON_DAILY_4AM_UTC },
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_CLIENT_PREFERENCE, pattern: CRON_DAILY_4AM_UTC },
      { queue: this.aiOperationsQueue, name: JOB_CHURN_RISK_COMPUTE, pattern: CRON_DAILY_5AM_UTC },
      { queue: this.aiOperationsQueue, name: JOB_RECOMMENDATION_CLEANUP, pattern: CRON_SUNDAY_2AM_UTC },
      // Partners queue
      { queue: this.partnersQueue, name: JOB_PARTNER_PAYOUT_BATCH, pattern: CRON_FIRST_OF_MONTH },
    ];

    for (const { queue, name, pattern } of schedules) {
      try {
        await queue.add(name, {}, { repeat: { pattern }, ...defaultOpts });
        this.logger.log(`Registered repeating job: ${name} (${pattern})`);
      } catch (error) {
        this.logger.error(`Failed to register repeating job ${name}: ${error}`);
      }
    }
  }
}
