import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEngineService } from '@/workflows/workflow-engine.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const BOOKING_ID = 'booking-001';
const CLIENT_ID = 'client-001';

const TENANT_BRANDING = {
  name: 'Best Barber',
  slug: 'best-barber',
  logoUrl: 'https://cdn.savspot.co/logo.png',
  brandColor: '#FF5500',
  currency: 'USD',
  timezone: 'America/New_York',
};

function makePrisma() {
  return {
    tenant: { findUniqueOrThrow: vi.fn() },
    invoice: { findFirst: vi.fn() },
    workflowAutomation: { findMany: vi.fn() },
    notificationType: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
  };
}

function makeComms() {
  return {
    createAndSend: vi.fn().mockResolvedValue('comm-001'),
  };
}

function makeSmsService() {
  return {
    sendSms: vi.fn().mockResolvedValue({ success: true, sid: 'SM001' }),
  };
}

function baseCancelledPayload() {
  return {
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    serviceId: 'service-001',
    clientId: CLIENT_ID,
    clientEmail: 'jane@example.com',
    clientName: 'Jane Doe',
    serviceName: 'Haircut',
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    source: 'ONLINE',
    cancellationReason: 'Schedule conflict',
    refundAmount: 2500,
  };
}

function basePaymentPayload() {
  return {
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    paymentId: 'pay-001',
    amount: 5000,
    currency: 'USD',
    clientId: CLIENT_ID,
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    serviceName: 'Haircut',
  };
}

function baseBookingPayload() {
  return {
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    serviceId: 'service-001',
    clientId: CLIENT_ID,
    clientEmail: 'jane@example.com',
    clientName: 'Jane Doe',
    serviceName: 'Haircut',
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    source: 'ONLINE',
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prisma: ReturnType<typeof makePrisma>;
  let comms: ReturnType<typeof makeComms>;
  let smsService: ReturnType<typeof makeSmsService>;

  beforeEach(() => {
    prisma = makePrisma();
    comms = makeComms();
    smsService = makeSmsService();
    prisma.tenant.findUniqueOrThrow.mockResolvedValue(TENANT_BRANDING);
    const configService = { get: (key: string, defaultValue: string) => defaultValue } as never;
    const invoicesService = { createForBooking: vi.fn().mockResolvedValue({}) } as never;
    service = new WorkflowEngineService(prisma as never, comms as never, smsService as never, configService, invoicesService);
  });

  // -----------------------------------------------------------------------
  // handleBookingCancelled
  // -----------------------------------------------------------------------

  describe('handleBookingCancelled', () => {
    it('should load tenant branding and send booking-cancellation email', async () => {
      const payload = baseCancelledPayload();
      await service.handleBookingCancelled(payload);

      expect(prisma.tenant.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          brandColor: true,
          currency: true,
          timezone: true,
        },
      });

      expect(comms.createAndSend).toHaveBeenCalledTimes(1);
      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateKey).toBe('booking-cancellation');
      expect(call.channel).toBe('EMAIL');
    });

    it('should include cancellationReason and refundAmount in template data', async () => {
      const payload = baseCancelledPayload();
      await service.handleBookingCancelled(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateData.cancellationReason).toBe('Schedule conflict');
      expect(call.templateData.refundAmount).toBe(2500);
    });

    it('should use clientId as recipientId', async () => {
      const payload = baseCancelledPayload();
      await service.handleBookingCancelled(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.recipientId).toBe(CLIENT_ID);
      expect(call.recipientEmail).toBe('jane@example.com');
      expect(call.recipientName).toBe('Jane Doe');
    });

    it('should include tenant branding fields in template data', async () => {
      const payload = baseCancelledPayload();
      await service.handleBookingCancelled(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateData.businessName).toBe('Best Barber');
      expect(call.templateData.logoUrl).toBe('https://cdn.savspot.co/logo.png');
      expect(call.templateData.brandColor).toBe('#FF5500');
      expect(call.templateData.currency).toBe('USD');
    });

    it('should log error and not throw when tenant branding lookup fails', async () => {
      prisma.tenant.findUniqueOrThrow.mockRejectedValue(new Error('Tenant not found'));
      const payload = baseCancelledPayload();

      // Should not throw — error is caught internally
      await expect(service.handleBookingCancelled(payload)).resolves.toBeUndefined();
      expect(comms.createAndSend).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // handlePaymentReceived
  // -----------------------------------------------------------------------

  describe('handlePaymentReceived', () => {
    it('should load tenant branding and send payment-receipt email', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const payload = basePaymentPayload();
      await service.handlePaymentReceived(payload);

      expect(prisma.tenant.findUniqueOrThrow).toHaveBeenCalled();
      expect(comms.createAndSend).toHaveBeenCalledTimes(1);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateKey).toBe('payment-receipt');
      expect(call.channel).toBe('EMAIL');
    });

    it('should include invoiceNumber in template data when invoice exists', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ invoiceNumber: 'INV-2026-0042' });
      const payload = basePaymentPayload();
      await service.handlePaymentReceived(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateData.invoiceNumber).toBe('INV-2026-0042');
    });

    it('should set invoiceNumber to null when no invoice exists', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const payload = basePaymentPayload();
      await service.handlePaymentReceived(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateData.invoiceNumber).toBeNull();
    });

    it('should include payment amount and currency in template data', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const payload = basePaymentPayload();
      await service.handlePaymentReceived(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateData.amount).toBe(5000);
      expect(call.templateData.currency).toBe('USD');
    });

    it('should pass bookingId in createAndSend params', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const payload = basePaymentPayload();
      await service.handlePaymentReceived(payload);

      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.bookingId).toBe(BOOKING_ID);
    });
  });

  // -----------------------------------------------------------------------
  // handleBookingConfirmed (workflow-driven)
  // -----------------------------------------------------------------------

  describe('handleBookingConfirmed', () => {
    it('should query workflowAutomation for active BOOKING_CONFIRMED automations', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([]);
      const payload = baseBookingPayload();
      await service.handleBookingConfirmed(payload);

      expect(prisma.workflowAutomation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          triggerEvent: 'BOOKING_CONFIRMED',
          isActive: true,
        },
      });
    });

    it('should not call createAndSend when no automations exist', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([]);
      const payload = baseBookingPayload();
      await service.handleBookingConfirmed(payload);

      expect(comms.createAndSend).not.toHaveBeenCalled();
    });

    it('should call createAndSend when SEND_EMAIL automation exists', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'auto-001',
          actionType: 'SEND_EMAIL',
          actionConfig: { template_key: 'booking-confirmation' },
        },
      ]);
      const payload = baseBookingPayload();
      await service.handleBookingConfirmed(payload);

      expect(comms.createAndSend).toHaveBeenCalledTimes(1);
      const call = comms.createAndSend.mock.calls[0]![0];
      expect(call.templateKey).toBe('booking-confirmation');
      expect(call.recipientId).toBe(CLIENT_ID);
    });

    it('should execute multiple automations independently', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'auto-001',
          actionType: 'SEND_EMAIL',
          actionConfig: { template_key: 'booking-confirmation' },
        },
        {
          id: 'auto-002',
          actionType: 'SEND_NOTIFICATION',
          actionConfig: { title: 'Booking confirmed' },
        },
      ]);
      prisma.notificationType.findFirst.mockResolvedValue({ id: 'ntype-001' });
      prisma.notification.create.mockResolvedValue({});

      const payload = baseBookingPayload();
      await service.handleBookingConfirmed(payload);

      // Email automation
      expect(comms.createAndSend).toHaveBeenCalledTimes(1);
      // Notification automation
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // handleBookingWalkIn
  // -----------------------------------------------------------------------

  describe('handleBookingWalkIn', () => {
    it('should trigger BOOKING_COMPLETED workflows (not BOOKING_WALK_IN)', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([]);
      const payload = baseBookingPayload();
      await service.handleBookingWalkIn(payload);

      expect(prisma.workflowAutomation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          triggerEvent: 'BOOKING_COMPLETED',
          isActive: true,
        },
      });
    });

    it('should send follow-up email when BOOKING_COMPLETED automation is configured', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'auto-followup',
          actionType: 'SEND_EMAIL',
          actionConfig: { template_key: 'follow-up', delay_minutes: 60 },
        },
      ]);
      const payload = baseBookingPayload();
      await service.handleBookingWalkIn(payload);

      expect(comms.createAndSend).toHaveBeenCalledTimes(1);
      // Verify delay was passed through
      const options = comms.createAndSend.mock.calls[0]![1];
      expect(options).toEqual({ delayMs: 60 * 60 * 1000 });
    });
  });

  // -----------------------------------------------------------------------
  // Error handling in executeWorkflows
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should not block other automations when one fails', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'auto-fail',
          actionType: 'SEND_EMAIL',
          actionConfig: { template_key: 'booking-confirmation' },
        },
        {
          id: 'auto-succeed',
          actionType: 'SEND_EMAIL',
          actionConfig: { template_key: 'follow-up' },
        },
      ]);

      // First call fails, second succeeds
      comms.createAndSend
        .mockRejectedValueOnce(new Error('Email provider down'))
        .mockResolvedValueOnce('comm-002');

      const payload = baseBookingPayload();
      await service.handleBookingConfirmed(payload);

      // Both automations attempted
      expect(comms.createAndSend).toHaveBeenCalledTimes(2);
    });

    it('should handle workflowAutomation query failure gracefully', async () => {
      prisma.workflowAutomation.findMany.mockRejectedValue(
        new Error('Database connection lost'),
      );

      const payload = baseBookingPayload();
      // Should not throw
      await expect(service.handleBookingConfirmed(payload)).resolves.toBeUndefined();
      expect(comms.createAndSend).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // handleBookingCompleted
  // -----------------------------------------------------------------------

  describe('handleBookingCompleted', () => {
    it('should query for BOOKING_COMPLETED automations', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([]);
      const payload = baseBookingPayload();
      await service.handleBookingCompleted(payload);

      expect(prisma.workflowAutomation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          triggerEvent: 'BOOKING_COMPLETED',
          isActive: true,
        },
      });
    });

    it('should execute SEND_NOTIFICATION action for completed booking', async () => {
      prisma.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'auto-notif',
          actionType: 'SEND_NOTIFICATION',
          actionConfig: { title: 'Appointment complete', body: 'Thanks for visiting!' },
        },
      ]);
      prisma.notificationType.findFirst.mockResolvedValue({ id: 'ntype-001' });
      prisma.notification.create.mockResolvedValue({});

      const payload = baseBookingPayload();
      await service.handleBookingCompleted(payload);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: CLIENT_ID,
          tenantId: TENANT_ID,
          typeId: 'ntype-001',
          title: 'Appointment complete',
          body: 'Thanks for visiting!',
        }),
      });
    });
  });
});
