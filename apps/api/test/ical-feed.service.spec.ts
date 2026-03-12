import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IcalFeedService } from '@/calendar/ical-feed.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TENANT_SLUG = 'acme-salon';
const FEED_TOKEN = 'feed-token-abc123';
const CONNECTION_ID = 'conn-001';
const USER_ID = 'user-001';

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

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Acme Salon',
    timezone: 'America/New_York',
    ...overrides,
  };
}

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: CONNECTION_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    ...overrides,
  };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-001',
    tenantId: TENANT_ID,
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    status: 'CONFIRMED',
    notes: null,
    service: { name: 'Haircut' },
    client: { name: 'Jane Doe', email: 'jane@example.com' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('IcalFeedService', () => {
  let service: IcalFeedService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new IcalFeedService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // generateFeed - validation
  // -------------------------------------------------------------------------

  describe('generateFeed', () => {
    it('should throw UnauthorizedException when token is empty', async () => {
      await expect(service.generateFeed(TENANT_SLUG, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException when tenant slug not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.generateFeed(TENANT_SLUG, FEED_TOKEN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when no connection matches token', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.generateFeed(TENANT_SLUG, FEED_TOKEN),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when connection belongs to different tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ tenantId: 'other-tenant' }),
      );

      await expect(
        service.generateFeed(TENANT_SLUG, FEED_TOKEN),
      ).rejects.toThrow(UnauthorizedException);
    });

    // -----------------------------------------------------------------------
    // generateFeed - success
    // -----------------------------------------------------------------------

    it('should generate valid iCal output with VCALENDAR wrapper', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('BEGIN:VCALENDAR');
      expect(feed).toContain('END:VCALENDAR');
      expect(feed).toContain('VERSION:2.0');
      expect(feed).toContain('METHOD:PUBLISH');
    });

    it('should include tenant name and timezone in calendar headers', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('X-WR-CALNAME:Acme Salon Bookings');
      expect(feed).toContain('X-WR-TIMEZONE:America/New_York');
    });

    it('should generate VEVENT for each confirmed booking', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([
        makeBooking(),
        makeBooking({ id: 'booking-002' }),
      ]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      const eventCount = (feed.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
    });

    it('should include service name and client name in SUMMARY', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([makeBooking()]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('SUMMARY:Haircut - Jane Doe');
    });

    it('should include booking notes in DESCRIPTION when present', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([
        makeBooking({ notes: 'Prefers short layers' }),
      ]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('Notes: Prefers short layers');
    });

    it('should omit notes line in DESCRIPTION when notes is null', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([makeBooking({ notes: null })]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).not.toContain('Notes:');
    });

    it('should use booking ID as UID with @savspot.com suffix', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([makeBooking()]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('UID:booking-001@savspot.com');
    });

    it('should use CRLF line endings per RFC 5545', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('\r\n');
    });

    it('should show N/A for client email when email is null', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([
        makeBooking({ client: { name: 'No Email Client', email: null } }),
      ]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(feed).toContain('Email: N/A');
    });

    it('should escape special iCal characters in summary and description', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([
        makeBooking({
          service: { name: 'Cut; Color, Style' },
          client: { name: 'Jane, Jr.', email: 'j@e.com' },
        }),
      ]);

      const feed = await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      // Semicolons and commas should be escaped
      expect(feed).toContain('Cut\\; Color\\, Style');
    });

    it('should query only CONFIRMED bookings for the tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant());
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.booking.findMany.mockResolvedValue([]);

      await service.generateFeed(TENANT_SLUG, FEED_TOKEN);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'CONFIRMED',
            startTime: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          orderBy: { startTime: 'asc' },
        }),
      );
    });
  });
});
