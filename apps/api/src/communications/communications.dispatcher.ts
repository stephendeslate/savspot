import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_COMMUNICATION,
  JOB_PROCESS_POST_APPOINTMENT,
  JOB_DELIVER_PROVIDER_SMS,
  JOB_SEND_MORNING_SUMMARY,
  JOB_SEND_WEEKLY_DIGEST,
  JOB_DELIVER_BROWSER_PUSH,
  JOB_SEND_BOOKING_REMINDERS,
  JOB_PROCESS_HOURLY_DIGESTS,
  JOB_PROCESS_DAILY_DIGESTS,
} from '../bullmq/queue.constants';
import { SupportTriageHandler } from '../jobs/support-triage.processor';
import { JOB_SUPPORT_TRIAGE } from '../bullmq/queue.constants';
import { CommunicationsHandler } from './communications.processor';
import { SmsHandler } from '../sms/sms.processor';
import { MorningSummaryHandler } from '../sms/morning-summary.processor';
import { WeeklyDigestHandler } from '../sms/weekly-digest.processor';
import { BrowserPushHandler } from '../browser-push/browser-push.processor';
import { ProcessNotificationDigestsHandler } from '../jobs/process-notification-digests.processor';

@Processor(QUEUE_COMMUNICATIONS)
export class CommunicationsDispatcher extends WorkerHost {
  private readonly logger = new Logger(CommunicationsDispatcher.name);

  constructor(
    private readonly communications: CommunicationsHandler,
    private readonly sms: SmsHandler,
    private readonly morningSummary: MorningSummaryHandler,
    private readonly weeklyDigest: WeeklyDigestHandler,
    private readonly browserPush: BrowserPushHandler,
    private readonly supportTriage: SupportTriageHandler,
    private readonly notificationDigests: ProcessNotificationDigestsHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_DELIVER_COMMUNICATION:
      case JOB_PROCESS_POST_APPOINTMENT:
      case JOB_SEND_BOOKING_REMINDERS:
        return this.communications.handle(job);
      case JOB_DELIVER_PROVIDER_SMS:
        return this.sms.handle(job);
      case JOB_SEND_MORNING_SUMMARY:
        return this.morningSummary.handle(job);
      case JOB_SEND_WEEKLY_DIGEST:
        return this.weeklyDigest.handle(job);
      case JOB_DELIVER_BROWSER_PUSH:
        return this.browserPush.handle(job);
      case JOB_SUPPORT_TRIAGE:
        return this.supportTriage.handle(job);
      case JOB_PROCESS_HOURLY_DIGESTS:
        return this.notificationDigests.handleHourly(job);
      case JOB_PROCESS_DAILY_DIGESTS:
        return this.notificationDigests.handleDaily(job);
      default:
        this.logger.warn(`Unknown communications job: ${job.name}`);
    }
  }
}
