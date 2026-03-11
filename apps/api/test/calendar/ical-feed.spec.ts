import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IcalFeedService } from '@/calendar/ical-feed.service';
import { IcalFeedController } from '@/calendar/ical-feed.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_SLUG = 'acme-salon';
const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const TOKEN = 'feed-token-uuid';
const BOOKING_ID = 'booking-001';

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
    },
    calendarConnection: {
      findUnique: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
  };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tenantId: TENANT_ID,
    status: 'CONFIRMED',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    notes: null,
    service: { name: 'Haircut' },
    client: { name: 'Jane Doe', email: 'jane@test.com' },
    venue: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// IcalFeedService
// ---------------------------------------------------------------------------

describe('IcalFeedService', () => {
  let service: IcalFeedService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new IcalFeedService(prisma as never);
  });

  it('should generate a valid iCal feed for confirmed bookings', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Acme Salon',
      timezone: 'America/New_York',
    });
    prisma.calendarConnection.findUnique.mockResolvedValue({
      id: 'conn-001',
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    prisma.booking.findMany.mockResolvedValue([makeBooking()]);

    const result = await service.generateFeed(TENANT_SLUG, TOKEN);

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('END:VCALENDAR');
    expect(result).toContain('BEGIN:VEVENT');
    expect(result).toContain('Haircut - Jane Doe');
    expect(result).toContain(`UID:${BOOKING_ID}@savspot.com`);
    expect(result).toContain('STATUS:CONFIRMED');
  });

  it('should include notes in description when present', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Acme Salon',
      timezone: 'America/New_York',
    });
    prisma.calendarConnection.findUnique.mockResolvedValue({
      id: 'conn-001',
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    prisma.booking.findMany.mockResolvedValue([
      makeBooking({ notes: 'Extra long hair' }),
    ]);

    const result = await service.generateFeed(TENANT_SLUG, TOKEN);

    expect(result).toContain('Notes: Extra long hair');
  });

  it('should throw UnauthorizedException for missing token', async () => {
    await expect(service.generateFeed(TENANT_SLUG, '')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw NotFoundException for unknown tenant slug', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(service.generateFeed('unknown', TOKEN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Acme Salon',
      timezone: 'America/New_York',
    });
    prisma.calendarConnection.findUnique.mockResolvedValue(null);

    await expect(service.generateFeed(TENANT_SLUG, 'bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token belongs to different tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Acme Salon',
      timezone: 'America/New_York',
    });
    prisma.calendarConnection.findUnique.mockResolvedValue({
      id: 'conn-001',
      tenantId: 'other-tenant',
      userId: USER_ID,
    });

    await expect(service.generateFeed(TENANT_SLUG, TOKEN)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return empty calendar when no confirmed bookings', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Acme Salon',
      timezone: 'America/New_York',
    });
    prisma.calendarConnection.findUnique.mockResolvedValue({
      id: 'conn-001',
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.generateFeed(TENANT_SLUG, TOKEN);

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('END:VCALENDAR');
    expect(result).not.toContain('BEGIN:VEVENT');
  });
});

// ---------------------------------------------------------------------------
// IcalFeedController
// ---------------------------------------------------------------------------

describe('IcalFeedController', () => {
  let controller: IcalFeedController;
  let mockService: { generateFeed: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = { generateFeed: vi.fn() };
    controller = new IcalFeedController(mockService as never);
  });

  it('should call service.generateFeed and send response', async () => {
    const icalContent = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';
    mockService.generateFeed.mockResolvedValue(icalContent);

    const res = {
      set: vi.fn(),
      send: vi.fn(),
    };

    await controller.getFeed(TENANT_SLUG, 'provider', TOKEN, res as never);

    expect(mockService.generateFeed).toHaveBeenCalledWith(TENANT_SLUG, TOKEN);
    expect(res.set).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="calendar.ics"',
    );
    expect(res.send).toHaveBeenCalledWith(icalContent);
  });
});
