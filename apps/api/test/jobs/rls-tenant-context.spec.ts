import { describe, it, expect, vi } from 'vitest';
import { ExpireReservationsHandler } from '@/jobs/expire-reservations.processor';
import { CleanupRetentionHandler } from '@/jobs/cleanup-retention.processor';
import { AbandonedRecoveryHandler } from '@/jobs/abandoned-recovery.processor';
import { EnforceApprovalDeadlinesHandler } from '@/jobs/enforce-approval-deadlines.processor';
import { EnforcePaymentDeadlinesHandler } from '@/jobs/enforce-payment-deadlines.processor';
import { ProcessCompletedBookingsHandler } from '@/jobs/process-completed-bookings.processor';
import { RetryFailedPaymentsHandler } from '@/jobs/retry-failed-payments.processor';
import { SendPaymentRemindersHandler } from '@/jobs/send-payment-reminders.processor';
import { AccountDeletionHandler } from '@/jobs/account-deletion.processor';
import { GenerateInvoicePdfProcessor } from '@/jobs/generate-invoice-pdf.processor';
import { InvoicePdfService } from '@/jobs/invoice-pdf.service';
import { CommunicationsHandler } from '@/communications/communications.processor';
import { CalendarPushHandler } from '@/calendar/calendar-push.processor';
import { CalendarSyncHandler } from '@/calendar/calendar-sync.processor';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeJob(data: Record<string, unknown> = {}) {
  return { data, name: '' } as never;
}

/** Captures set_config calls made via $executeRaw tagged template */
function captureSetConfigCalls(mockExecuteRaw: ReturnType<typeof vi.fn>) {
  return mockExecuteRaw.mock.calls.filter((call) => {
    // Tagged template calls produce an array of strings + values
    const templateStrings = call[0];
    if (Array.isArray(templateStrings)) {
      return templateStrings.some(
        (s: string) => typeof s === 'string' && s.includes('set_config'),
      );
    }
    return false;
  });
}

/** Creates a mock tx object with $executeRaw and common models */
function makeMockTx(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    booking: { update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    bookingStateHistory: { create: vi.fn() },
    bookingSession: { updateMany: vi.fn(), deleteMany: vi.fn() },
    dateReservation: { updateMany: vi.fn(), deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn(), create: vi.fn() },
    invoice: { update: vi.fn(), findFirst: vi.fn() },
    payment: { update: vi.fn() },
    paymentStateHistory: { create: vi.fn() },
    bookingReminder: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    communication: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    calendarConnection: { findFirst: vi.fn() },
    calendarEvent: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    tenantMembership: { findMany: vi.fn() },
    notificationType: { upsert: vi.fn() },
    user: { update: vi.fn() },
    consentRecord: { deleteMany: vi.fn() },
    onboardingTour: { deleteMany: vi.fn() },
    browserPushSubscription: { deleteMany: vi.fn() },
    dataRequest: { update: vi.fn() },
    serviceProvider: { findFirst: vi.fn() },
    ...overrides,
  };
}

function makePrisma() {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    booking: { update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    bookingStateHistory: { create: vi.fn() },
    bookingSession: { findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    dateReservation: { updateMany: vi.fn(), deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn(), create: vi.fn() },
    invoice: { update: vi.fn(), findFirst: vi.fn() },
    payment: { update: vi.fn() },
    paymentStateHistory: { create: vi.fn() },
    bookingReminder: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    communication: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    calendarConnection: { findFirst: vi.fn() },
    calendarEvent: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    tenantMembership: { findMany: vi.fn() },
    notificationType: { upsert: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    consentRecord: { deleteMany: vi.fn() },
    onboardingTour: { deleteMany: vi.fn() },
    browserPushSubscription: { deleteMany: vi.fn() },
    dataRequest: { findMany: vi.fn(), update: vi.fn() },
    serviceProvider: { findFirst: vi.fn() },
    auditLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
}

// ---------------------------------------------------------------------------
// Tests: Each processor must call set_config within $transaction
// ---------------------------------------------------------------------------

describe('RLS tenant context in BullMQ job processors', () => {
  // -------------------------------------------------------------------------
  // ExpireReservationsHandler
  // -------------------------------------------------------------------------
  describe('ExpireReservationsHandler', () => {
    it('should call set_config with tenant ID inside $transaction for each tenant', async () => {
      const prisma = makePrisma();
      const handler = new ExpireReservationsHandler(prisma as never);

      prisma.$queryRaw.mockResolvedValue([
        { tenant_id: 'tenant-aaa' },
        { tenant_id: 'tenant-bbb' },
      ]);

      const txCalls: Array<{ tenantId: string }> = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        tx.dateReservation.updateMany.mockResolvedValue({ count: 1 });
        const result = await fn(tx);
        const setConfigCalls = captureSetConfigCalls(tx.$executeRaw);
        if (setConfigCalls.length > 0) {
          txCalls.push({ tenantId: setConfigCalls[0]![1] });
        }
        return result;
      });

      await handler.handle();

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(txCalls).toHaveLength(2);
      expect(txCalls[0]!.tenantId).toBe('tenant-aaa');
      expect(txCalls[1]!.tenantId).toBe('tenant-bbb');
    });
  });

  // -------------------------------------------------------------------------
  // CleanupRetentionHandler
  // -------------------------------------------------------------------------
  describe('CleanupRetentionHandler', () => {
    it('should call set_config per tenant inside $transaction', async () => {
      const prisma = makePrisma();
      const handler = new CleanupRetentionHandler(prisma as never);

      prisma.$queryRaw.mockResolvedValue([{ tenant_id: 'tenant-cleanup' }]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        tx.dateReservation.deleteMany.mockResolvedValue({ count: 0 });
        tx.bookingSession.deleteMany.mockResolvedValue({ count: 0 });
        tx.notification.deleteMany.mockResolvedValue({ count: 0 });
        tx.communication.deleteMany.mockResolvedValue({ count: 0 });
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-cleanup']);
    });
  });

  // -------------------------------------------------------------------------
  // AbandonedRecoveryHandler
  // -------------------------------------------------------------------------
  describe('AbandonedRecoveryHandler', () => {
    it('should call set_config per tenant when marking sessions as ABANDONED', async () => {
      const prisma = makePrisma();
      const commsService = { createAndSend: vi.fn() };
      const handler = new AbandonedRecoveryHandler(prisma as never, commsService as never);

      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'session-1',
          tenant_id: 'tenant-abc',
          client_id: null,
          service_id: null,
          service_name: null,
          tenant_name: 'Test Biz',
          tenant_slug: 'test',
          tenant_logo_url: null,
          tenant_brand_color: null,
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        tx.bookingSession.updateMany.mockResolvedValue({ count: 1 });
        tx.dateReservation.updateMany.mockResolvedValue({ count: 0 });
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-abc']);
    });
  });

  // -------------------------------------------------------------------------
  // EnforceApprovalDeadlinesHandler
  // -------------------------------------------------------------------------
  describe('EnforceApprovalDeadlinesHandler', () => {
    it('should call set_config with correct tenant ID for each expired booking', async () => {
      const prisma = makePrisma();
      const paymentsQueue = { add: vi.fn() };
      const handler = new EnforceApprovalDeadlinesHandler(prisma as never, paymentsQueue as never);

      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'booking-expired',
          tenant_id: 'tenant-xyz',
          service_id: 'svc-1',
          created_at: new Date('2026-01-01'),
          approval_deadline_hours: 48,
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        // For the payment query transaction, return empty
        tx.$queryRaw.mockResolvedValue([]);
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle();

      // Two transactions: one for cancellation, one for payment check
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(capturedTenantIds).toEqual(['tenant-xyz', 'tenant-xyz']);
    });
  });

  // -------------------------------------------------------------------------
  // EnforcePaymentDeadlinesHandler
  // -------------------------------------------------------------------------
  describe('EnforcePaymentDeadlinesHandler', () => {
    it('should call set_config per invoice within a single transaction', async () => {
      const prisma = makePrisma();
      const handler = new EnforcePaymentDeadlinesHandler(prisma as never);

      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-1',
          tenant_id: 'tenant-pay',
          booking_id: 'booking-1',
          status: 'SENT',
          auto_cancel_on_overdue: false,
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle(makeJob());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-pay']);
    });
  });

  // -------------------------------------------------------------------------
  // ProcessCompletedBookingsHandler
  // -------------------------------------------------------------------------
  describe('ProcessCompletedBookingsHandler', () => {
    it('should call set_config per booking in $transaction', async () => {
      const prisma = makePrisma();
      const events = { emitBookingCompleted: vi.fn() };
      const handler = new ProcessCompletedBookingsHandler(prisma as never, events as never);

      // First $queryRaw: detectNoShows (empty); second: auto-complete with booking
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'booking-comp',
            tenant_id: 'tenant-comp',
            service_id: 'svc-1',
            client_id: 'client-1',
            start_time: new Date(),
            end_time: new Date(),
            client_email: 'a@b.com',
            client_name: 'Test',
            service_name: 'Svc',
            source: 'ONLINE',
          },
        ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-comp']);
    });
  });

  // -------------------------------------------------------------------------
  // RetryFailedPaymentsHandler
  // -------------------------------------------------------------------------
  describe('RetryFailedPaymentsHandler', () => {
    it('should call set_config when marking payment as succeeded', async () => {
      const prisma = makePrisma();
      const stripeProvider = {
        retrievePaymentIntent: vi.fn().mockResolvedValue({ status: 'succeeded' }),
        confirmPaymentIntent: vi.fn(),
      };
      const handler = new RetryFailedPaymentsHandler(prisma as never, stripeProvider as never);

      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'pay-1',
          tenant_id: 'tenant-retry',
          booking_id: 'booking-1',
          provider_transaction_id: 'pi_123',
          retry_count: 0,
          amount: '50.00',
          currency: 'USD',
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle(makeJob());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-retry']);
    });

    it('should call set_config when incrementing retry count', async () => {
      const prisma = makePrisma();
      const stripeProvider = {
        retrievePaymentIntent: vi.fn().mockResolvedValue({ status: 'processing' }),
        confirmPaymentIntent: vi.fn(),
      };
      const handler = new RetryFailedPaymentsHandler(prisma as never, stripeProvider as never);

      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'pay-2',
          tenant_id: 'tenant-inc',
          booking_id: 'booking-2',
          provider_transaction_id: 'pi_456',
          retry_count: 1,
          amount: '25.00',
          currency: 'USD',
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle(makeJob());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-inc']);
    });
  });

  // -------------------------------------------------------------------------
  // SendPaymentRemindersHandler
  // -------------------------------------------------------------------------
  describe('SendPaymentRemindersHandler', () => {
    it('should call set_config per invoice when creating reminders', async () => {
      const prisma = makePrisma();
      const commsQueue = { add: vi.fn() };
      const handler = new SendPaymentRemindersHandler(prisma as never, commsQueue as never);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-rem',
          tenant_id: 'tenant-rem',
          booking_id: 'booking-rem',
          due_date: tomorrow,
          total: '100.00',
          currency: 'USD',
          client_id: 'client-rem',
          client_email: 'test@test.com',
          client_name: 'Test',
          service_name: 'Svc',
        },
      ]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        tx.bookingReminder.findUnique.mockResolvedValue(null); // no existing reminder
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle(makeJob());

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(capturedTenantIds.length).toBeGreaterThan(0);
      expect(capturedTenantIds[0]).toBe('tenant-rem');
    });
  });

  // -------------------------------------------------------------------------
  // AccountDeletionHandler
  // -------------------------------------------------------------------------
  describe('AccountDeletionHandler', () => {
    it('should call set_config per tenant in tenant-scoped transactions', async () => {
      const prisma = makePrisma();
      const handler = new AccountDeletionHandler(prisma as never);

      prisma.dataRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          userId: 'user-del',
          requestType: 'DELETION',
          status: 'PENDING',
          deadlineAt: new Date('2026-01-01'),
          user: { id: 'user-del', email: 'del@test.com', name: 'Del User' },
        },
      ]);

      // First $queryRaw returns tenant IDs
      prisma.$queryRaw.mockResolvedValue([{ tenant_id: 'tenant-del-1' }]);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle();

      // One tenant-scoped tx + one global tx
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      // Only the first (tenant-scoped) transaction should have set_config
      expect(capturedTenantIds).toEqual(['tenant-del-1']);
    });
  });

  // -------------------------------------------------------------------------
  // GenerateInvoicePdfProcessor
  // -------------------------------------------------------------------------
  describe('GenerateInvoicePdfProcessor', () => {
    it('should call set_config when loading and updating invoice', async () => {
      const prisma = makePrisma();
      const uploadService = {
        getPresignedUploadUrl: vi.fn().mockResolvedValue({
          uploadUrl: 'https://upload.test',
          publicUrl: 'https://public.test/invoice.html',
        }),
      };
      const service = new InvoicePdfService(prisma as never, uploadService as never);
      const handler = new GenerateInvoicePdfProcessor(service);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        // Mock invoice.findFirst to return null (invoice not found) to short-circuit
        tx.invoice.findFirst.mockResolvedValue(null);
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      const job = makeJob({}) as never;
      // Override job to have the right name and data
      (job as { name: string }).name = 'generateInvoicePdf';
      (job as { data: Record<string, string> }).data = {
        tenantId: 'tenant-inv',
        invoiceId: 'inv-pdf',
      };

      await handler.process(job);

      // The load transaction calls set_config, the early return on null skips the update tx
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(capturedTenantIds).toContain('tenant-inv');
    });
  });

  // -------------------------------------------------------------------------
  // CalendarPushHandler
  // -------------------------------------------------------------------------
  describe('CalendarPushHandler', () => {
    it('should call set_config when querying calendar connection', async () => {
      const prisma = makePrisma();
      const calendarService = { createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn() };
      const configService = { get: vi.fn().mockReturnValue('http://localhost:3000') };
      const handler = new CalendarPushHandler(
        prisma as never,
        calendarService as never,
        configService as never,
      );

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        // Return null connection to short-circuit
        tx.calendarConnection.findFirst.mockResolvedValue(null);
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      const data = {
        eventType: 'booking.confirmed',
        tenantId: 'tenant-cal',
        bookingId: 'booking-cal',
        serviceName: 'Haircut',
        clientName: 'Jane',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };

      await handler.handle(data);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-cal']);
    });
  });

  // -------------------------------------------------------------------------
  // CalendarSyncHandler
  // -------------------------------------------------------------------------
  describe('CalendarSyncHandler', () => {
    it('should call set_config when detecting conflicts', async () => {
      const prisma = makePrisma();
      const calendarService = {
        syncInboundEvents: vi.fn().mockResolvedValue({ added: 1, updated: 0, deleted: 0 }),
      };
      const handler = new CalendarSyncHandler(calendarService as never, prisma as never);

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        // Return inbound events for conflict detection
        tx.calendarEvent.findMany.mockResolvedValue([]);
        tx.booking.findMany.mockResolvedValue([]);
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      await handler.handle({
        connectionId: 'conn-1',
        tenantId: 'tenant-sync',
      });

      // The sync handler calls detectConflicts which uses $transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(capturedTenantIds).toEqual(['tenant-sync']);
    });
  });

  // -------------------------------------------------------------------------
  // CommunicationsHandler
  // -------------------------------------------------------------------------
  describe('CommunicationsHandler', () => {
    it('should call set_config when loading and updating communication status', async () => {
      const prisma = makePrisma();
      const configService = {
        get: vi.fn().mockReturnValue(undefined), // No Resend key = dev mode
      };
      const commsService = { renderTemplate: vi.fn() };
      const bookingRemindersHandler = { handle: vi.fn() };
      const circuitBreaker = {
        canSend: vi.fn().mockResolvedValue(true),
        recordSuccess: vi.fn().mockResolvedValue(undefined),
        recordFailure: vi.fn().mockResolvedValue(undefined),
      };
      const handler = new CommunicationsHandler(
        prisma as never,
        configService as never,
        commsService as never,
        bookingRemindersHandler as never,
        circuitBreaker as never,
      );

      const capturedTenantIds: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = makeMockTx();
        // Mock communication for loading
        tx.communication.findUnique.mockResolvedValue({
          id: 'comm-1',
          status: 'QUEUED',
          subject: 'Test',
          body: '<p>Test</p>',
          templateKey: null,
          metadata: {},
          recipient: { email: 'test@test.com', name: 'Test' },
          tenant: { name: 'Biz', logoUrl: null, brandColor: null },
        });
        const result = await fn(tx);
        const calls = captureSetConfigCalls(tx.$executeRaw);
        if (calls.length > 0) capturedTenantIds.push(calls[0]![1]);
        return result;
      });

      const job = {
        data: { communicationId: 'comm-1', tenantId: 'tenant-comm' },
        name: 'deliverCommunication',
      } as never;

      await handler.handle(job);

      // Load + SENDING update + SENT update = 3 transactions
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
      expect(capturedTenantIds.every((id) => id === 'tenant-comm')).toBe(true);
    });
  });
});
