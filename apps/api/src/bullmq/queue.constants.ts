/**
 * BullMQ queue names and job definitions for all Sprint 4 background jobs.
 * Queue architecture per SRS-3 §18.
 */

// ---- Queue Names ----
export const QUEUE_BOOKINGS = 'bookings';
export const QUEUE_PAYMENTS = 'payments';
export const QUEUE_CALENDAR = 'calendar';
export const QUEUE_COMMUNICATIONS = 'communications';
export const QUEUE_INVOICES = 'invoices';
export const QUEUE_GDPR = 'gdpr';

export const ALL_QUEUES = [
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
] as const;

// ---- Queue Concurrency ----
export const QUEUE_CONCURRENCY: Record<string, number> = {
  [QUEUE_BOOKINGS]: 5,
  [QUEUE_PAYMENTS]: 5,
  [QUEUE_CALENDAR]: 3,
  [QUEUE_COMMUNICATIONS]: 10,
  [QUEUE_INVOICES]: 3,
  [QUEUE_GDPR]: 2,
};

// ---- Job Names ----

// Booking queue jobs (SRS-3 §16)
export const JOB_EXPIRE_RESERVATIONS = 'expireReservations';
export const JOB_ABANDONED_BOOKING_RECOVERY = 'abandonedBookingRecovery';
export const JOB_PROCESS_COMPLETED_BOOKINGS = 'processCompletedBookings';
export const JOB_ENFORCE_APPROVAL_DEADLINES = 'enforceApprovalDeadlines';

// Payment queue jobs (SRS-3 §17, SRS-4 §41)
export const JOB_SEND_PAYMENT_REMINDERS = 'sendPaymentReminders';
export const JOB_ENFORCE_PAYMENT_DEADLINES = 'enforcePaymentDeadlines';
export const JOB_RETRY_FAILED_PAYMENTS = 'retryFailedPayments';
export const JOB_PROCESS_WEBHOOK_RETRIES = 'processWebhookRetries';
export const JOB_DETECT_ORPHAN_PAYMENTS = 'detectOrphanPayments';
export const JOB_RECONCILE_PAYMENTS = 'reconcilePayments';

// Calendar queue jobs (SRS-3 §16)
export const JOB_CALENDAR_TWO_WAY_SYNC = 'calendarTwoWaySync';
export const JOB_CALENDAR_TOKEN_REFRESH = 'calendarTokenRefresh';
export const JOB_CALENDAR_EVENT_PUSH = 'calendarEventPush';
export const JOB_CALENDAR_WATCH_RENEWAL = 'calendarWatchRenewal';

// Communications queue jobs (SRS-4 §40)
export const JOB_DELIVER_COMMUNICATION = 'deliverCommunication';
export const JOB_DELIVER_PROVIDER_SMS = 'deliverProviderSMS';
export const JOB_DELIVER_BROWSER_PUSH = 'deliverBrowserPush';
export const JOB_SEND_BOOKING_REMINDERS = 'sendBookingReminders';
export const JOB_PROCESS_POST_APPOINTMENT = 'processPostAppointmentTriggers';
export const JOB_SEND_MORNING_SUMMARY = 'sendMorningSummary';
export const JOB_SEND_WEEKLY_DIGEST = 'sendWeeklyDigest';

// Invoice queue jobs (SRS-3 §17)
export const JOB_GENERATE_INVOICE_PDF = 'generateInvoicePdf';

// GDPR queue jobs (SRS-4 §41a)
export const JOB_CLEANUP_RETENTION = 'cleanupRetentionPolicy';
export const JOB_PROCESS_DATA_EXPORT = 'processDataExportRequest';
export const JOB_PROCESS_ACCOUNT_DELETION = 'processAccountDeletion';

// Support queue jobs
export const JOB_SUPPORT_TRIAGE = 'supportTriage';

// Notification digest jobs
export const JOB_PROCESS_HOURLY_DIGESTS = 'processHourlyDigests';
export const JOB_PROCESS_DAILY_DIGESTS = 'processDailyDigests';

// AI Operations queue jobs (Phase 2)
export const JOB_COMPUTE_NO_SHOW_RISK = 'computeNoShowRisk';
export const JOB_COMPUTE_CLIENT_INSIGHTS = 'computeClientInsights';
export const JOB_COMPUTE_DEMAND_ANALYSIS = 'computeDemandAnalysis';
export const JOB_COMPUTE_BENCHMARKS = 'computeBenchmarks';

// ---- Cron Schedules ----
export const CRON_EVERY_5_MIN = '*/5 * * * *';
export const CRON_EVERY_15_MIN = '*/15 * * * *';
export const CRON_EVERY_30_MIN = '*/30 * * * *';
export const CRON_HOURLY = '0 * * * *';
export const CRON_DAILY_3AM_UTC = '0 3 * * *';
export const CRON_DAILY_5AM_UTC = '0 5 * * *';
export const CRON_DAILY_6AM_UTC = '0 6 * * *';
export const CRON_DAILY_8AM_UTC = '0 8 * * *';
export const CRON_MONDAY_8AM_UTC = '0 8 * * 1';
export const CRON_DAILY_2AM_UTC = '0 2 * * *';
export const CRON_DAILY_4AM_UTC = '0 4 * * *';
export const CRON_SUNDAY_2AM_UTC = '0 2 * * 0';
