import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GdprDispatcher } from '@/jobs/gdpr.dispatcher';
import { BookingsDispatcher } from '@/jobs/bookings.dispatcher';
import { PaymentsDispatcher } from '@/jobs/payments.dispatcher';
import { CalendarDispatcher } from '@/calendar/calendar.dispatcher';
import { CommunicationsDispatcher } from '@/communications/communications.dispatcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHandler() {
  return { handle: vi.fn().mockResolvedValue(undefined) };
}

function makeJob(name: string, data: Record<string, unknown> = {}) {
  return { name, data } as never;
}

// ---------------------------------------------------------------------------
// GdprDispatcher
// ---------------------------------------------------------------------------

describe('GdprDispatcher', () => {
  let dispatcher: GdprDispatcher;
  let cleanupRetention: ReturnType<typeof makeHandler>;
  let dataExport: ReturnType<typeof makeHandler>;
  let accountDeletion: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    cleanupRetention = makeHandler();
    dataExport = makeHandler();
    accountDeletion = makeHandler();
    dispatcher = new GdprDispatcher(
      cleanupRetention as never,
      dataExport as never,
      accountDeletion as never,
      makeHandler() as never,
    );
  });

  it('should route cleanupRetentionPolicy to CleanupRetentionHandler', async () => {
    const job = makeJob('cleanupRetentionPolicy');
    await dispatcher.process(job);
    expect(cleanupRetention.handle).toHaveBeenCalledWith();
  });

  it('should route processDataExportRequest to DataExportHandler', async () => {
    const data = { dataRequestId: 'req-1', userId: 'user-1' };
    const job = makeJob('processDataExportRequest', data);
    await dispatcher.process(job);
    expect(dataExport.handle).toHaveBeenCalledWith(data);
  });

  it('should route processAccountDeletion to AccountDeletionHandler', async () => {
    const job = makeJob('processAccountDeletion');
    await dispatcher.process(job);
    expect(accountDeletion.handle).toHaveBeenCalledWith();
  });

  it('should not throw for unknown job names', async () => {
    await expect(dispatcher.process(makeJob('unknownJob'))).resolves.toBeUndefined();
    expect(cleanupRetention.handle).not.toHaveBeenCalled();
    expect(dataExport.handle).not.toHaveBeenCalled();
    expect(accountDeletion.handle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// BookingsDispatcher
// ---------------------------------------------------------------------------

describe('BookingsDispatcher', () => {
  let dispatcher: BookingsDispatcher;
  let expireReservations: ReturnType<typeof makeHandler>;
  let abandonedRecovery: ReturnType<typeof makeHandler>;
  let processCompleted: ReturnType<typeof makeHandler>;
  let enforceApprovals: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    expireReservations = makeHandler();
    abandonedRecovery = makeHandler();
    processCompleted = makeHandler();
    enforceApprovals = makeHandler();
    dispatcher = new BookingsDispatcher(
      expireReservations as never,
      abandonedRecovery as never,
      processCompleted as never,
      enforceApprovals as never,
      makeHandler() as never,
      makeHandler() as never,
    );
  });

  it('should route expireReservations correctly', async () => {
    const job = makeJob('expireReservations');
    await dispatcher.process(job);
    expect(expireReservations.handle).toHaveBeenCalledWith(job);
  });

  it('should route abandonedBookingRecovery correctly', async () => {
    const job = makeJob('abandonedBookingRecovery');
    await dispatcher.process(job);
    expect(abandonedRecovery.handle).toHaveBeenCalledWith(job);
  });

  it('should route processCompletedBookings correctly', async () => {
    const job = makeJob('processCompletedBookings');
    await dispatcher.process(job);
    expect(processCompleted.handle).toHaveBeenCalledWith(job);
  });

  it('should route enforceApprovalDeadlines correctly', async () => {
    const job = makeJob('enforceApprovalDeadlines');
    await dispatcher.process(job);
    expect(enforceApprovals.handle).toHaveBeenCalledWith(job);
  });

  it('should not throw for unknown job names', async () => {
    await expect(dispatcher.process(makeJob('unknownJob'))).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PaymentsDispatcher
// ---------------------------------------------------------------------------

describe('PaymentsDispatcher', () => {
  let dispatcher: PaymentsDispatcher;
  let sendReminders: ReturnType<typeof makeHandler>;
  let enforceDeadlines: ReturnType<typeof makeHandler>;
  let retryFailed: ReturnType<typeof makeHandler>;
  let processWebhookRetries: ReturnType<typeof makeHandler>;
  let detectOrphanPayments: ReturnType<typeof makeHandler>;
  let reconcilePayments: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    sendReminders = makeHandler();
    enforceDeadlines = makeHandler();
    retryFailed = makeHandler();
    processWebhookRetries = makeHandler();
    detectOrphanPayments = makeHandler();
    reconcilePayments = makeHandler();
    dispatcher = new PaymentsDispatcher(
      sendReminders as never,
      enforceDeadlines as never,
      retryFailed as never,
      processWebhookRetries as never,
      detectOrphanPayments as never,
      reconcilePayments as never,
    );
  });

  it('should route sendPaymentReminders correctly', async () => {
    const job = makeJob('sendPaymentReminders');
    await dispatcher.process(job);
    expect(sendReminders.handle).toHaveBeenCalledWith(job);
  });

  it('should route enforcePaymentDeadlines correctly', async () => {
    const job = makeJob('enforcePaymentDeadlines');
    await dispatcher.process(job);
    expect(enforceDeadlines.handle).toHaveBeenCalledWith(job);
  });

  it('should route retryFailedPayments correctly', async () => {
    const job = makeJob('retryFailedPayments');
    await dispatcher.process(job);
    expect(retryFailed.handle).toHaveBeenCalledWith(job);
  });

  it('should route processWebhookRetries correctly', async () => {
    const job = makeJob('processWebhookRetries');
    await dispatcher.process(job);
    expect(processWebhookRetries.handle).toHaveBeenCalledWith(job);
  });

  it('should route detectOrphanPayments correctly', async () => {
    const job = makeJob('detectOrphanPayments');
    await dispatcher.process(job);
    expect(detectOrphanPayments.handle).toHaveBeenCalledWith(job);
  });

  it('should route reconcilePayments correctly', async () => {
    const job = makeJob('reconcilePayments');
    await dispatcher.process(job);
    expect(reconcilePayments.handle).toHaveBeenCalledWith(job);
  });

  it('should not throw for unknown job names', async () => {
    await expect(dispatcher.process(makeJob('unknownJob'))).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CalendarDispatcher
// ---------------------------------------------------------------------------

describe('CalendarDispatcher', () => {
  let dispatcher: CalendarDispatcher;
  let pushHandler: ReturnType<typeof makeHandler>;
  let syncHandler: ReturnType<typeof makeHandler>;
  let tokenHandler: ReturnType<typeof makeHandler>;
  let watchRenewalHandler: ReturnType<typeof makeHandler>;
  let webhookRenewGoogleHandler: ReturnType<typeof makeHandler>;
  let webhookRenewOutlookHandler: ReturnType<typeof makeHandler>;
  let syncFallbackHandler: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    pushHandler = makeHandler();
    syncHandler = makeHandler();
    tokenHandler = makeHandler();
    watchRenewalHandler = makeHandler();
    webhookRenewGoogleHandler = makeHandler();
    webhookRenewOutlookHandler = makeHandler();
    syncFallbackHandler = makeHandler();
    dispatcher = new CalendarDispatcher(
      pushHandler as never,
      syncHandler as never,
      tokenHandler as never,
      watchRenewalHandler as never,
      webhookRenewGoogleHandler as never,
      webhookRenewOutlookHandler as never,
      syncFallbackHandler as never,
    );
  });

  it('should route calendarEventPush correctly', async () => {
    const job = makeJob('calendarEventPush');
    await dispatcher.process(job);
    expect(pushHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarTwoWaySync correctly', async () => {
    const job = makeJob('calendarTwoWaySync');
    await dispatcher.process(job);
    expect(syncHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarTokenRefresh correctly', async () => {
    const job = makeJob('calendarTokenRefresh');
    await dispatcher.process(job);
    expect(tokenHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarWatchRenewal correctly', async () => {
    const job = makeJob('calendarWatchRenewal');
    await dispatcher.process(job);
    expect(watchRenewalHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarWebhookRenewGoogle correctly', async () => {
    const job = makeJob('calendarWebhookRenewGoogle');
    await dispatcher.process(job);
    expect(webhookRenewGoogleHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarWebhookRenewOutlook correctly', async () => {
    const job = makeJob('calendarWebhookRenewOutlook');
    await dispatcher.process(job);
    expect(webhookRenewOutlookHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should route calendarSyncFallback correctly', async () => {
    const job = makeJob('calendarSyncFallback');
    await dispatcher.process(job);
    expect(syncFallbackHandler.handle).toHaveBeenCalledWith(job);
  });

  it('should not throw for unknown job names', async () => {
    await expect(dispatcher.process(makeJob('unknownJob'))).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CommunicationsDispatcher
// ---------------------------------------------------------------------------

describe('CommunicationsDispatcher', () => {
  let dispatcher: CommunicationsDispatcher;
  let communications: ReturnType<typeof makeHandler>;
  let sms: ReturnType<typeof makeHandler>;
  let morningSummary: ReturnType<typeof makeHandler>;
  let weeklyDigest: ReturnType<typeof makeHandler>;
  let browserPush: ReturnType<typeof makeHandler>;
  let supportTriage: ReturnType<typeof makeHandler>;
  let notificationDigests: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    communications = makeHandler();
    sms = makeHandler();
    morningSummary = makeHandler();
    weeklyDigest = makeHandler();
    browserPush = makeHandler();
    supportTriage = makeHandler();
    notificationDigests = makeHandler();
    dispatcher = new CommunicationsDispatcher(
      communications as never,
      sms as never,
      morningSummary as never,
      weeklyDigest as never,
      browserPush as never,
      supportTriage as never,
      notificationDigests as never,
      makeHandler() as never,
    );
  });

  it('should route deliverCommunication correctly', async () => {
    const job = makeJob('deliverCommunication');
    await dispatcher.process(job);
    expect(communications.handle).toHaveBeenCalledWith(job);
  });

  it('should route processPostAppointmentTriggers correctly', async () => {
    const job = makeJob('processPostAppointmentTriggers');
    await dispatcher.process(job);
    expect(communications.handle).toHaveBeenCalledWith(job);
  });

  it('should route sendBookingReminders correctly', async () => {
    const job = makeJob('sendBookingReminders');
    await dispatcher.process(job);
    expect(communications.handle).toHaveBeenCalledWith(job);
  });

  it('should route deliverProviderSMS correctly', async () => {
    const job = makeJob('deliverProviderSMS');
    await dispatcher.process(job);
    expect(sms.handle).toHaveBeenCalledWith(job);
  });

  it('should route sendMorningSummary correctly', async () => {
    const job = makeJob('sendMorningSummary');
    await dispatcher.process(job);
    expect(morningSummary.handle).toHaveBeenCalledWith(job);
  });

  it('should route sendWeeklyDigest correctly', async () => {
    const job = makeJob('sendWeeklyDigest');
    await dispatcher.process(job);
    expect(weeklyDigest.handle).toHaveBeenCalledWith(job);
  });

  it('should route deliverBrowserPush correctly', async () => {
    const job = makeJob('deliverBrowserPush');
    await dispatcher.process(job);
    expect(browserPush.handle).toHaveBeenCalledWith(job);
  });

  it('should route supportTriage correctly', async () => {
    const job = makeJob('supportTriage');
    await dispatcher.process(job);
    expect(supportTriage.handle).toHaveBeenCalledWith(job);
  });

  it('should not throw for unknown job names', async () => {
    await expect(dispatcher.process(makeJob('unknownJob'))).resolves.toBeUndefined();
  });
});
