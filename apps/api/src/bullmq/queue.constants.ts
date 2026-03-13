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
export const QUEUE_IMPORTS = 'imports';
export const QUEUE_CURRENCY_REFRESH = 'currency-refresh';
export const QUEUE_WEBHOOKS = 'webhooks';
export const QUEUE_VOICE_CALLS = 'voice-calls';
export const QUEUE_ACCOUNTING = 'accounting';

// Phase 4 queues
export const QUEUE_PLATFORM_METRICS = 'platform-metrics';
export const QUEUE_AI_OPERATIONS = 'ai-operations';
export const QUEUE_DIRECTORY = 'directory';
export const QUEUE_CUSTOM_DOMAINS = 'custom-domains';
export const QUEUE_PARTNERS = 'partners';

export const ALL_QUEUES = [
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
  QUEUE_IMPORTS,
  QUEUE_CURRENCY_REFRESH,
  QUEUE_WEBHOOKS,
  QUEUE_VOICE_CALLS,
  QUEUE_ACCOUNTING,
  QUEUE_PLATFORM_METRICS,
  QUEUE_AI_OPERATIONS,
  QUEUE_DIRECTORY,
  QUEUE_CUSTOM_DOMAINS,
  QUEUE_PARTNERS,
] as const;

// ---- Queue Concurrency ----
export const QUEUE_CONCURRENCY: Record<string, number> = {
  [QUEUE_BOOKINGS]: 5,
  [QUEUE_PAYMENTS]: 5,
  [QUEUE_CALENDAR]: 3,
  [QUEUE_COMMUNICATIONS]: 10,
  [QUEUE_INVOICES]: 3,
  [QUEUE_GDPR]: 2,
  [QUEUE_IMPORTS]: 3,
  [QUEUE_CURRENCY_REFRESH]: 1,
  [QUEUE_WEBHOOKS]: 5,
  [QUEUE_VOICE_CALLS]: 3,
  [QUEUE_ACCOUNTING]: 3,
  [QUEUE_PLATFORM_METRICS]: 2,
  [QUEUE_AI_OPERATIONS]: 3,
  [QUEUE_DIRECTORY]: 2,
  [QUEUE_CUSTOM_DOMAINS]: 2,
  [QUEUE_PARTNERS]: 1,
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

// Import queue jobs
export const JOB_PROCESS_IMPORT = 'processImport';

// Support queue jobs
export const JOB_SUPPORT_TRIAGE = 'supportTriage';

// Notification digest jobs
export const JOB_PROCESS_HOURLY_DIGESTS = 'processHourlyDigests';
export const JOB_PROCESS_DAILY_DIGESTS = 'processDailyDigests';

// Currency refresh queue jobs
export const JOB_REFRESH_RATES = 'refreshRates';

// AI Operations queue jobs (Phase 2)
export const JOB_COMPUTE_NO_SHOW_RISK = 'computeNoShowRisk';
export const JOB_COMPUTE_CLIENT_INSIGHTS = 'computeClientInsights';
export const JOB_COMPUTE_DEMAND_ANALYSIS = 'computeDemandAnalysis';
export const JOB_COMPUTE_BENCHMARKS = 'computeBenchmarks';

// Webhook queue jobs (Phase 3)
export const JOB_DISPATCH_WEBHOOK = 'dispatchWebhook';
export const JOB_EXECUTE_STAGE = 'executeStage';

// Accounting sync queue jobs (Phase 3)
export const JOB_ACCOUNTING_SYNC_INVOICES = 'accountingSyncInvoices';
export const JOB_ACCOUNTING_SYNC_PAYMENTS = 'accountingSyncPayments';
export const JOB_ACCOUNTING_SYNC_CLIENTS = 'accountingSyncClients';
export const JOB_ACCOUNTING_SYNC_SINGLE_INVOICE = 'accountingSyncSingleInvoice';

// Voice queue jobs (Phase 3)
export const JOB_PROCESS_TRANSCRIPT = 'processTranscript';
export const JOB_POST_CALL_ACTIONS = 'postCallActions';

// Platform Metrics queue jobs (Phase 4)
export const JOB_COMPUTE_PLATFORM_METRICS = 'computePlatformMetrics';
export const JOB_DIRECTORY_LISTING_REFRESH = 'directoryListingRefresh';
export const JOB_DIRECTORY_SITEMAP_GENERATE = 'directorySitemapGenerate';

// Custom Domain queue jobs (Phase 4)
export const JOB_CUSTOM_DOMAIN_DNS_VERIFY = 'customDomainDnsVerify';
export const JOB_CUSTOM_DOMAIN_SSL_RENEW = 'customDomainSslRenew';
export const JOB_CUSTOM_DOMAIN_HEALTH_CHECK = 'customDomainHealthCheck';

// Calendar push sync jobs (Phase 4)
export const JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE = 'calendarWebhookRenewGoogle';
export const JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK = 'calendarWebhookRenewOutlook';
export const JOB_CALENDAR_SYNC_FALLBACK = 'calendarSyncFallback';

// AI Recommendation queue jobs (Phase 4)
export const JOB_RECOMMENDATION_SERVICE_AFFINITY = 'recommendationServiceAffinity';
export const JOB_RECOMMENDATION_CLIENT_PREFERENCE = 'recommendationClientPreference';
export const JOB_CHURN_RISK_COMPUTE = 'churnRiskCompute';
export const JOB_RECOMMENDATION_CLEANUP = 'recommendationCleanup';

// Partner payout queue jobs (Phase 4)
export const JOB_PARTNER_PAYOUT_BATCH = 'partnerPayoutBatch';

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
export const CRON_DAILY_4AM_UTC = '0 4 * * *';
export const CRON_SUNDAY_2AM_UTC = '0 2 * * 0';
export const CRON_EVERY_6_HOURS = '0 */6 * * *';
export const CRON_FIRST_OF_MONTH = '0 0 1 * *';
