import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarSyncHandler } from '../src/calendar/calendar-sync.processor';

function makePrisma() {
  const prisma = {
    calendarEvent: {
      findMany: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
    tenantMembership: {
      findMany: vi.fn(),
    },
    notificationType: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  // $transaction executes the callback with the prisma mock as the tx arg
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma));
  return prisma;
}

function makeCalendarService() {
  return {
    syncInboundEvents: vi.fn(),
  };
}

describe('CalendarSyncHandler — conflict detection (S7)', () => {
  let handler: CalendarSyncHandler;
  let prisma: ReturnType<typeof makePrisma>;
  let calendarService: ReturnType<typeof makeCalendarService>;

  beforeEach(() => {
    prisma = makePrisma();
    calendarService = makeCalendarService();
    handler = new CalendarSyncHandler(calendarService as never, prisma as never);
  });

  const makeData = (data = {}) => ({
    connectionId: 'conn-1',
    tenantId: 'tenant-1',
    ...data,
  });

  it('detects conflicts when new inbound events overlap with bookings', async () => {
    calendarService.syncInboundEvents.mockResolvedValue({
      added: 1,
      updated: 0,
      deleted: 0,
    });

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEndDate = new Date(futureDate.getTime() + 60 * 60 * 1000);

    prisma.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'cal-event-1',
        title: 'Doctor Appointment',
        startTime: futureDate,
        endTime: futureEndDate,
      },
    ]);

    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        startTime: futureDate,
        endTime: futureEndDate,
        service: { name: 'Haircut' },
        client: { name: 'Jane Doe' },
      },
    ]);

    prisma.tenantMembership.findMany.mockResolvedValue([
      { userId: 'owner-1' },
    ]);

    prisma.notificationType.upsert.mockResolvedValue({ id: 'notif-type-1' });
    prisma.notification.create.mockResolvedValue({});

    await handler.handle(makeData());

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'owner-1',
        typeId: 'notif-type-1',
        title: 'Calendar Conflict Detected',
        body: expect.stringContaining('Doctor Appointment'),
      }),
    });
  });

  it('skips conflict detection when no events were added or updated', async () => {
    calendarService.syncInboundEvents.mockResolvedValue({
      added: 0,
      updated: 0,
      deleted: 2,
    });

    await handler.handle(makeData());

    expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
  });

  it('does not create notifications when no conflicts exist', async () => {
    calendarService.syncInboundEvents.mockResolvedValue({
      added: 1,
      updated: 0,
      deleted: 0,
    });

    prisma.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'cal-event-1',
        title: 'Lunch',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
      },
    ]);

    prisma.booking.findMany.mockResolvedValue([]); // no overlapping bookings

    await handler.handle(makeData());

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('creates notifications for each staff member on conflict', async () => {
    calendarService.syncInboundEvents.mockResolvedValue({
      added: 1,
      updated: 0,
      deleted: 0,
    });

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    prisma.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'cal-1',
        title: 'Meeting',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 3600000),
      },
    ]);

    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        service: { name: 'Consult' },
        client: { name: 'Bob' },
      },
    ]);

    prisma.tenantMembership.findMany.mockResolvedValue([
      { userId: 'owner-1' },
      { userId: 'admin-1' },
    ]);

    prisma.notificationType.upsert.mockResolvedValue({ id: 'type-1' });
    prisma.notification.create.mockResolvedValue({});

    await handler.handle(makeData());

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });
});
