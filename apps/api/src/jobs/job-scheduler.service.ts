import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_GDPR,
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
  JOB_SEND_MORNING_SUMMARY,
  JOB_SEND_WEEKLY_DIGEST,
  JOB_CLEANUP_RETENTION,
  JOB_PROCESS_ACCOUNT_DELETION,
  CRON_EVERY_5_MIN,
  CRON_EVERY_15_MIN,
  CRON_EVERY_30_MIN,
  CRON_HOURLY,
  CRON_DAILY_3AM_UTC,
  CRON_DAILY_5AM_UTC,
  CRON_DAILY_6AM_UTC,
  CRON_MONDAY_8AM_UTC,
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
      { queue: this.commsQueue, name: JOB_PROCESS_POST_APPOINTMENT, pattern: CRON_EVERY_15_MIN },
      { queue: this.commsQueue, name: JOB_SEND_MORNING_SUMMARY, pattern: CRON_DAILY_6AM_UTC },
      { queue: this.commsQueue, name: JOB_SEND_WEEKLY_DIGEST, pattern: CRON_MONDAY_8AM_UTC },
      // GDPR queue
      { queue: this.gdprQueue, name: JOB_CLEANUP_RETENTION, pattern: CRON_DAILY_3AM_UTC },
      { queue: this.gdprQueue, name: JOB_PROCESS_ACCOUNT_DELETION, pattern: CRON_DAILY_5AM_UTC },
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
