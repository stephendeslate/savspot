import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientPortalService } from '../src/client-portal/client-portal.service';

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    bookingStateHistory: {
      count: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makeQueue() {
  return { add: vi.fn().mockResolvedValue(undefined) };
}

describe('ClientPortalService — requestReschedule (S3)', () => {
  let service: ClientPortalService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const mockPaymentsService = { processRefund: vi.fn().mockResolvedValue({}) };
    const mockAvailabilityService = { getAvailableSlots: vi.fn().mockResolvedValue([]) };
    service = new ClientPortalService(prisma as never, mockPaymentsService as never, mockAvailabilityService as never, makeQueue() as never);
  });

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const futureEndDate = new Date(futureDate.getTime() + 60 * 60 * 1000);

  it('reschedules a CONFIRMED booking', async () => {
    prisma.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        tenantId: 'tenant-1',
        clientId: 'user-1',
        status: 'CONFIRMED',
        serviceId: 'svc-1',
        startTime: new Date('2026-03-15T10:00:00Z'),
        endTime: new Date('2026-03-15T11:00:00Z'),
        service: {
          id: 'svc-1',
          name: 'Haircut',
          confirmationMode: 'AUTO_CONFIRM',
          maxRescheduleCount: 3,
        },
      })
      .mockResolvedValueOnce(null); // no conflicts
    prisma.bookingStateHistory.count.mockResolvedValue(0);
    prisma.bookingStateHistory.create.mockResolvedValue({});
    prisma.booking.update.mockResolvedValue({
      id: 'booking-1',
      startTime: futureDate,
      endTime: futureEndDate,
    });

    const result = await service.requestReschedule(
      'user-1',
      'booking-1',
      futureDate.toISOString(),
      futureEndDate.toISOString(),
    );

    expect(result.booking.id).toBe('booking-1');
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          startTime: futureDate,
          endTime: futureEndDate,
        }),
      }),
    );
  });

  it('throws if booking not found', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.requestReschedule('user-1', 'booking-1', futureDate.toISOString(), futureEndDate.toISOString()),
    ).rejects.toThrow('Booking not found');
  });

  it('throws if booking is CANCELLED', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      status: 'CANCELLED',
      service: { maxRescheduleCount: 3 },
    });

    await expect(
      service.requestReschedule('user-1', 'booking-1', futureDate.toISOString(), futureEndDate.toISOString()),
    ).rejects.toThrow('Cannot reschedule');
  });

  it('throws if max reschedule count reached', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      status: 'CONFIRMED',
      service: { maxRescheduleCount: 2 },
    });
    prisma.bookingStateHistory.count.mockResolvedValue(2);

    await expect(
      service.requestReschedule('user-1', 'booking-1', futureDate.toISOString(), futureEndDate.toISOString()),
    ).rejects.toThrow('Maximum reschedule limit');
  });

  it('throws if new start time is in the past', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      status: 'CONFIRMED',
      service: { maxRescheduleCount: 3 },
    });
    prisma.bookingStateHistory.count.mockResolvedValue(0);

    await expect(
      service.requestReschedule(
        'user-1',
        'booking-1',
        new Date('2020-01-01T10:00:00Z').toISOString(),
        new Date('2020-01-01T11:00:00Z').toISOString(),
      ),
    ).rejects.toThrow('New start time must be in the future');
  });

  it('creates booking state history with reschedule metadata', async () => {
    prisma.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        tenantId: 'tenant-1',
        clientId: 'user-1',
        status: 'CONFIRMED',
        serviceId: 'svc-1',
        startTime: new Date('2026-03-15T10:00:00Z'),
        endTime: new Date('2026-03-15T11:00:00Z'),
        service: { maxRescheduleCount: 3 },
      })
      .mockResolvedValueOnce(null); // no conflicts
    prisma.bookingStateHistory.count.mockResolvedValue(0);
    prisma.bookingStateHistory.create.mockResolvedValue({});
    prisma.booking.update.mockResolvedValue({ id: 'booking-1' });

    await service.requestReschedule(
      'user-1',
      'booking-1',
      futureDate.toISOString(),
      futureEndDate.toISOString(),
      'Need to move to next week',
    );

    expect(prisma.bookingStateHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'booking-1',
        triggeredBy: 'CLIENT',
        reason: 'Rescheduled by client: Need to move to next week',
        metadata: expect.objectContaining({
          type: 'RESCHEDULE_REQUEST',
          newStartTime: futureDate.toISOString(),
          newEndTime: futureEndDate.toISOString(),
        }),
      }),
    });
  });
});
