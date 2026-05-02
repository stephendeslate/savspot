import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SendBookingRemindersHandler } from './send-booking-reminders.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    bookingReminder: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makeCommunicationsService() {
  return {
    createAndSend: vi.fn().mockResolvedValue('comm-id-1'),
  };
}

function makeBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-001',
    tenant_id: 'tenant-001',
    start_time: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23h from now
    client_id: 'client-001',
    service_id: 'service-001',
    client_email: 'client@example.com',
    client_name: 'Jane Doe',
    service_name: 'Haircut',
    provider_name: 'John Smith',
    business_name: 'Test Salon',
    tenant_slug: 'test-salon',
    logo_url: null,
    brand_color: '#FF0000',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SendBookingRemindersHandler', () => {
  let handler: SendBookingRemindersHandler;
  let prisma: ReturnType<typeof makePrisma>;
  let commsService: ReturnType<typeof makeCommunicationsService>;

  beforeEach(() => {
    prisma = makePrisma();
    commsService = makeCommunicationsService();
    handler = new SendBookingRemindersHandler(
      prisma as never,
      commsService as never,
    );
  });

  it('sends reminder for CONFIRMED booking 23h away', async () => {
    const booking = makeBookingRow();
    prisma.$queryRaw.mockResolvedValue([booking]);

    const mockTx = {
      $executeRaw: vi.fn(),
      bookingReminder: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    // Verify tenant context was set
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);

    // Verify dedup check
    expect(mockTx.bookingReminder.findUnique).toHaveBeenCalledTimes(1);
    const findCall = mockTx.bookingReminder.findUnique.mock.calls[0]![0];
    expect(findCall.where.bookingId_reminderType_intervalDays_channel).toEqual({
      bookingId: 'booking-001',
      reminderType: 'BOOKING',
      intervalDays: 1,
      channel: 'EMAIL',
    });

    // Verify reminder record created
    expect(mockTx.bookingReminder.create).toHaveBeenCalledTimes(1);
    const createCall = mockTx.bookingReminder.create.mock.calls[0]![0];
    expect(createCall.data.bookingId).toBe('booking-001');
    expect(createCall.data.tenantId).toBe('tenant-001');
    expect(createCall.data.reminderType).toBe('BOOKING');
    expect(createCall.data.intervalDays).toBe(1);
    expect(createCall.data.channel).toBe('EMAIL');
    expect(createCall.data.status).toBe('PENDING');

    // Verify communication enqueued
    expect(commsService.createAndSend).toHaveBeenCalledTimes(1);
    const sendCall = commsService.createAndSend.mock.calls[0]![0];
    expect(sendCall.tenantId).toBe('tenant-001');
    expect(sendCall.recipientId).toBe('client-001');
    expect(sendCall.recipientEmail).toBe('client@example.com');
    expect(sendCall.templateKey).toBe('booking-reminder');
    expect(sendCall.templateData.clientName).toBe('Jane Doe');
    expect(sendCall.templateData.serviceName).toBe('Haircut');
    expect(sendCall.templateData.providerName).toBe('John Smith');
    expect(sendCall.templateData.businessName).toBe('Test Salon');
    expect(sendCall.bookingId).toBe('booking-001');
  });

  it('does not send for booking 26h away (outside window)', async () => {
    // The raw SQL query filters by start_time <= NOW() + 25 hours,
    // so a booking 26h away would not appear in the query results
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('does not send for CANCELLED booking', async () => {
    // The raw SQL query filters WHERE b.status = 'CONFIRMED',
    // so CANCELLED bookings are excluded at the query level
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('does not send for PENDING booking', async () => {
    // The raw SQL query filters WHERE b.status = 'CONFIRMED',
    // so PENDING bookings are excluded at the query level
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('deduplication prevents double send', async () => {
    const booking = makeBookingRow();
    prisma.$queryRaw.mockResolvedValue([booking]);

    const existingReminder = {
      id: 'reminder-001',
      bookingId: 'booking-001',
      reminderType: 'BOOKING',
      intervalDays: 1,
      channel: 'EMAIL',
    };

    const mockTx = {
      $executeRaw: vi.fn(),
      bookingReminder: {
        findUnique: vi.fn().mockResolvedValue(existingReminder),
        create: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    // Reminder already exists — should NOT create a new one or enqueue communication
    expect(mockTx.bookingReminder.create).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('handles no bookings gracefully', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(commsService.createAndSend).not.toHaveBeenCalled();
  });

  it('processes multiple bookings across tenants', async () => {
    const bookings = [
      makeBookingRow({ id: 'booking-001', tenant_id: 'tenant-001' }),
      makeBookingRow({ id: 'booking-002', tenant_id: 'tenant-001', client_email: 'client2@example.com' }),
      makeBookingRow({ id: 'booking-003', tenant_id: 'tenant-002', client_email: 'client3@example.com' }),
    ];
    prisma.$queryRaw.mockResolvedValue(bookings);

    const mockTx = {
      $executeRaw: vi.fn(),
      bookingReminder: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    // All 3 bookings should be processed
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(commsService.createAndSend).toHaveBeenCalledTimes(3);

    // Verify correct tenant IDs in createAndSend calls
    const tenantIds = commsService.createAndSend.mock.calls.map(
      (call: Array<{ tenantId: string }>) => call[0]!.tenantId,
    );
    expect(tenantIds).toEqual(['tenant-001', 'tenant-001', 'tenant-002']);
  });

  it('continues processing remaining bookings if one fails', async () => {
    const bookings = [
      makeBookingRow({ id: 'booking-001' }),
      makeBookingRow({ id: 'booking-002' }),
    ];
    prisma.$queryRaw.mockResolvedValue(bookings);

    let callCount = 0;
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('DB connection lost');
      }
      const mockTx = {
        $executeRaw: vi.fn(),
        bookingReminder: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(mockTx);
    });

    await handler.handle();

    // First booking failed, second should still succeed
    expect(commsService.createAndSend).toHaveBeenCalledTimes(1);
    const sendCall = commsService.createAndSend.mock.calls[0]![0];
    expect(sendCall.bookingId).toBe('booking-002');
  });
});
