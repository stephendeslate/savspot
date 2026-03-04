import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientsService } from '@/clients/clients.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CLIENT_ID = 'client-001';
const PROFILE_ID = 'profile-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    clientProfile: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFILE_ID,
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    tags: ['vip'],
    preferences: null,
    internalRating: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    client: {
      id: CLIENT_ID,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
      avatarUrl: null,
    },
    ...overrides,
  };
}

function makeStatsRow(overrides: Record<string, unknown> = {}) {
  return {
    client_id: CLIENT_ID,
    total_bookings: BigInt(5),
    total_revenue: 250.0,
    last_visit: new Date('2026-02-20T14:00:00Z'),
    first_visit: new Date('2025-11-01T10:00:00Z'),
    no_show_count: BigInt(1),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ClientsService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated results with meta', async () => {
      const profile = makeProfile();
      prisma.clientProfile.findMany.mockResolvedValue([profile]);
      prisma.clientProfile.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([makeStatsRow()]);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should return empty data array when no clients', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([]);
      prisma.clientProfile.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      // $queryRaw should NOT be called when there are no client IDs
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should include stats from raw query', async () => {
      const profile = makeProfile();
      prisma.clientProfile.findMany.mockResolvedValue([profile]);
      prisma.clientProfile.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([makeStatsRow()]);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      const client = result.data[0]!;
      expect(client.totalBookings).toBe(5);
      expect(client.totalRevenue).toBe(250.0);
      expect(client.lastVisitDate).toEqual(new Date('2026-02-20T14:00:00Z'));
      expect(client.firstVisitDate).toEqual(new Date('2025-11-01T10:00:00Z'));
      expect(client.noShowCount).toBe(1);
    });

    it('should return default stats when $queryRaw returns empty (no bookings for clients)', async () => {
      const profile = makeProfile();
      prisma.clientProfile.findMany.mockResolvedValue([profile]);
      prisma.clientProfile.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([]); // no booking stats at all

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      const client = result.data[0]!;
      expect(client.totalBookings).toBe(0);
      expect(client.totalRevenue).toBe(0);
      expect(client.lastVisitDate).toBeNull();
      expect(client.firstVisitDate).toBeNull();
      expect(client.noShowCount).toBe(0);
    });

    it('should map profile fields to response shape', async () => {
      const profile = makeProfile({
        tags: ['vip', 'returning'],
        preferences: { notes: 'Prefers mornings' },
        internalRating: 4,
      });
      prisma.clientProfile.findMany.mockResolvedValue([profile]);
      prisma.clientProfile.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([makeStatsRow()]);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });
      const client = result.data[0]!;

      expect(client.id).toBe(PROFILE_ID);
      expect(client.clientId).toBe(CLIENT_ID);
      expect(client.name).toBe('Jane Doe');
      expect(client.email).toBe('jane@example.com');
      expect(client.phone).toBe('+1234567890');
      expect(client.avatarUrl).toBeNull();
      expect(client.tags).toEqual(['vip', 'returning']);
      expect(client.preferences).toEqual({ notes: 'Prefers mornings' });
      expect(client.internalRating).toBe(4);
    });

    it('should calculate correct pagination meta', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([makeProfile()]);
      prisma.clientProfile.count.mockResolvedValue(55);
      prisma.$queryRaw.mockResolvedValue([makeStatsRow()]);

      const result = await service.findAll(TENANT_ID, { page: 2, limit: 20 });

      expect(result.meta).toEqual({
        total: 55,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });

    it('should pass skip and take for pagination', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([]);
      prisma.clientProfile.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.clientProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should apply search filter on user name, email, and phone', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([]);
      prisma.clientProfile.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { search: 'john', page: 1, limit: 20 });

      const where = prisma.clientProfile.findMany.mock.calls[0]![0].where;
      expect(where.tenantId).toBe(TENANT_ID);
      expect(where.client.OR).toEqual([
        { name: { contains: 'john', mode: 'insensitive' } },
        { email: { contains: 'john', mode: 'insensitive' } },
        { phone: { contains: 'john', mode: 'insensitive' } },
      ]);
    });

    it('should apply tag filtering with comma-separated tags', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([]);
      prisma.clientProfile.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { tags: 'vip, returning', page: 1, limit: 20 });

      const where = prisma.clientProfile.findMany.mock.calls[0]![0].where;
      expect(where.AND).toEqual([
        { tags: { array_contains: ['vip'] } },
        { tags: { array_contains: ['returning'] } },
      ]);
    });

    it('should sort by name ascending', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1', client: { ...makeProfile().client, name: 'Alice' } });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2', client: { ...makeProfile().client, name: 'Zara' } });
      prisma.clientProfile.findMany.mockResolvedValue([profileB, profileA]);
      prisma.clientProfile.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID, {
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 20,
      });

      expect(result.data[0]!.name).toBe('Alice');
      expect(result.data[1]!.name).toBe('Zara');
    });

    it('should sort by name descending', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1', client: { ...makeProfile().client, name: 'Alice' } });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2', client: { ...makeProfile().client, name: 'Zara' } });
      prisma.clientProfile.findMany.mockResolvedValue([profileA, profileB]);
      prisma.clientProfile.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID, {
        sortBy: 'name',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      });

      expect(result.data[0]!.name).toBe('Zara');
      expect(result.data[1]!.name).toBe('Alice');
    });

    it('should sort by totalBookings descending', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1' });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2' });
      prisma.clientProfile.findMany.mockResolvedValue([profileA, profileB]);
      prisma.clientProfile.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([
        makeStatsRow({ client_id: 'c1', total_bookings: BigInt(3) }),
        makeStatsRow({ client_id: 'c2', total_bookings: BigInt(10) }),
      ]);

      const result = await service.findAll(TENANT_ID, {
        sortBy: 'totalBookings',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      });

      expect(result.data[0]!.totalBookings).toBe(10);
      expect(result.data[1]!.totalBookings).toBe(3);
    });

    it('should sort by totalRevenue ascending', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1' });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2' });
      prisma.clientProfile.findMany.mockResolvedValue([profileA, profileB]);
      prisma.clientProfile.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([
        makeStatsRow({ client_id: 'c1', total_revenue: 500.0 }),
        makeStatsRow({ client_id: 'c2', total_revenue: 100.0 }),
      ]);

      const result = await service.findAll(TENANT_ID, {
        sortBy: 'totalRevenue',
        sortOrder: 'asc',
        page: 1,
        limit: 20,
      });

      expect(result.data[0]!.totalRevenue).toBe(100.0);
      expect(result.data[1]!.totalRevenue).toBe(500.0);
    });

    it('should sort by lastVisit descending by default', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1' });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2' });
      prisma.clientProfile.findMany.mockResolvedValue([profileA, profileB]);
      prisma.clientProfile.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([
        makeStatsRow({ client_id: 'c1', last_visit: new Date('2026-01-01T10:00:00Z') }),
        makeStatsRow({ client_id: 'c2', last_visit: new Date('2026-03-01T10:00:00Z') }),
      ]);

      // default sortBy is 'lastVisit', default sortOrder is 'desc'
      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data[0]!.clientId).toBe('c2'); // more recent visit first
      expect(result.data[1]!.clientId).toBe('c1');
    });

    it('should handle null lastVisitDate when sorting by lastVisit', async () => {
      const profileA = makeProfile({ id: 'p1', clientId: 'c1' });
      const profileB = makeProfile({ id: 'p2', clientId: 'c2' });
      prisma.clientProfile.findMany.mockResolvedValue([profileA, profileB]);
      prisma.clientProfile.count.mockResolvedValue(2);
      // c1 has stats, c2 has no stats (no bookings)
      prisma.$queryRaw.mockResolvedValue([
        makeStatsRow({ client_id: 'c1', last_visit: new Date('2026-02-20T14:00:00Z') }),
      ]);

      const result = await service.findAll(TENANT_ID, {
        sortBy: 'lastVisit',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      });

      // c1 has a date, c2 defaults to null (treated as 0), so c1 should come first in desc
      expect(result.data[0]!.clientId).toBe('c1');
      expect(result.data[1]!.clientId).toBe('c2');
    });

    it('should handle null total_revenue in stats', async () => {
      const profile = makeProfile();
      prisma.clientProfile.findMany.mockResolvedValue([profile]);
      prisma.clientProfile.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([
        makeStatsRow({ total_revenue: null }),
      ]);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data[0]!.totalRevenue).toBe(0);
    });

    it('should use default filters when none provided', async () => {
      prisma.clientProfile.findMany.mockResolvedValue([]);
      prisma.clientProfile.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    it('should return full client details with stats', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([
        {
          total_bookings: BigInt(8),
          total_revenue: 400.0,
          last_visit: new Date('2026-02-25T16:00:00Z'),
          first_visit: new Date('2025-11-15T10:00:00Z'),
          no_show_count: BigInt(2),
        },
      ]);

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.id).toBe(PROFILE_ID);
      expect(result.clientId).toBe(CLIENT_ID);
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.phone).toBe('+1234567890');
      expect(result.totalBookings).toBe(8);
      expect(result.totalRevenue).toBe(400.0);
      expect(result.lastVisitDate).toEqual(new Date('2026-02-25T16:00:00Z'));
      expect(result.firstVisitDate).toEqual(new Date('2025-11-15T10:00:00Z'));
      expect(result.noShowCount).toBe(2);
      expect(result.clientCreatedAt).toEqual(new Date('2025-10-01T08:00:00Z'));
      expect(result.profileCreatedAt).toEqual(new Date('2026-01-15T10:00:00Z'));
    });

    it('should throw NotFoundException when profile not found', async () => {
      prisma.clientProfile.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should include recentBookings array', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      const bookings = [
        {
          id: 'booking-001',
          startTime: new Date('2026-03-01T10:00:00Z'),
          status: 'COMPLETED',
          service: { id: 'svc-1', name: 'Haircut', durationMinutes: 60 },
        },
        {
          id: 'booking-002',
          startTime: new Date('2026-02-15T14:00:00Z'),
          status: 'CONFIRMED',
          service: { id: 'svc-2', name: 'Coloring', durationMinutes: 120 },
        },
      ];

      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue(bookings);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([
        {
          total_bookings: BigInt(2),
          total_revenue: 100.0,
          last_visit: new Date('2026-03-01T10:00:00Z'),
          first_visit: new Date('2026-02-15T14:00:00Z'),
          no_show_count: BigInt(0),
        },
      ]);

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.recentBookings).toHaveLength(2);
      expect(result.recentBookings[0]!.id).toBe('booking-001');
      expect(result.recentBookings[1]!.service.name).toBe('Coloring');
    });

    it('should include recentPayments array', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      const payments = [
        {
          id: 'pay-001',
          amount: 50,
          status: 'SUCCEEDED',
          createdAt: new Date('2026-03-01T10:30:00Z'),
          booking: { id: 'booking-001', startTime: new Date('2026-03-01T10:00:00Z') },
        },
      ];

      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue(payments);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([
        {
          total_bookings: BigInt(1),
          total_revenue: 50.0,
          last_visit: new Date('2026-03-01T10:00:00Z'),
          first_visit: new Date('2026-03-01T10:00:00Z'),
          no_show_count: BigInt(0),
        },
      ]);

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.recentPayments).toHaveLength(1);
      expect(result.recentPayments[0]!.id).toBe('pay-001');
      expect(result.recentPayments[0]!.booking.id).toBe('booking-001');
    });

    it('should include notes array', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      const notes = [
        {
          id: 'note-001',
          content: 'Allergic to certain products',
          entityType: 'CLIENT',
          entityId: CLIENT_ID,
          createdAt: new Date('2026-02-10T09:00:00Z'),
        },
      ];

      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue(notes);
      prisma.$queryRaw.mockResolvedValue([
        {
          total_bookings: BigInt(0),
          total_revenue: null,
          last_visit: null,
          first_visit: null,
          no_show_count: BigInt(0),
        },
      ]);

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]!.content).toBe('Allergic to certain products');
    });

    it('should return default stats when $queryRaw returns empty array', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([]); // empty — no booking rows at all

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.lastVisitDate).toBeNull();
      expect(result.firstVisitDate).toBeNull();
      expect(result.noShowCount).toBe(0);
    });

    it('should handle null total_revenue in stats', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([
        {
          total_bookings: BigInt(3),
          total_revenue: null,
          last_visit: null,
          first_visit: null,
          no_show_count: BigInt(0),
        },
      ]);

      const result = await service.findById(TENANT_ID, PROFILE_ID);

      expect(result.totalBookings).toBe(3);
      expect(result.totalRevenue).toBe(0);
    });

    it('should query bookings for the correct tenant and client', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.findById(TENANT_ID, PROFILE_ID);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, clientId: CLIENT_ID },
          orderBy: { startTime: 'desc' },
          take: 10,
        }),
      );
    });

    it('should query notes with correct entity type and id', async () => {
      const profile = makeProfile({
        client: {
          id: CLIENT_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          avatarUrl: null,
          createdAt: new Date('2025-10-01T08:00:00Z'),
        },
      });
      prisma.clientProfile.findFirst.mockResolvedValue(profile);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.note.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.findById(TENANT_ID, PROFILE_ID);

      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            entityType: 'CLIENT',
            entityId: CLIENT_ID,
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update tags successfully', async () => {
      const existing = makeProfile({ preferences: null });
      const updated = makeProfile({ tags: ['vip', 'returning'] });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, PROFILE_ID, {
        tags: ['vip', 'returning'],
      });

      expect(result.tags).toEqual(['vip', 'returning']);
      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROFILE_ID },
          data: expect.objectContaining({
            tags: ['vip', 'returning'],
          }),
        }),
      );
    });

    it('should update notes in preferences JSON', async () => {
      const existing = makeProfile({ preferences: null });
      const updated = makeProfile({
        preferences: { notes: 'Prefers morning appointments' },
      });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, PROFILE_ID, {
        notes: 'Prefers morning appointments',
      });

      expect(result.preferences).toEqual({ notes: 'Prefers morning appointments' });
      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: { notes: 'Prefers morning appointments' },
          }),
        }),
      );
    });

    it('should update internalNotes in preferences JSON', async () => {
      const existing = makeProfile({ preferences: null });
      const updated = makeProfile({
        preferences: { internalNotes: 'Tends to cancel last minute' },
      });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      await service.update(TENANT_ID, PROFILE_ID, {
        internalNotes: 'Tends to cancel last minute',
      });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: { internalNotes: 'Tends to cancel last minute' },
          }),
        }),
      );
    });

    it('should throw NotFoundException when profile not found', async () => {
      prisma.clientProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { tags: ['vip'] }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.clientProfile.update).not.toHaveBeenCalled();
    });

    it('should merge with existing preferences', async () => {
      const existing = makeProfile({
        preferences: { notes: 'Old notes', someSetting: true },
      });
      const updated = makeProfile({
        preferences: {
          notes: 'Old notes',
          someSetting: true,
          internalNotes: 'New internal notes',
        },
      });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      await service.update(TENANT_ID, PROFILE_ID, {
        internalNotes: 'New internal notes',
      });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: {
              notes: 'Old notes',
              someSetting: true,
              internalNotes: 'New internal notes',
            },
          }),
        }),
      );
    });

    it('should update both tags and notes simultaneously', async () => {
      const existing = makeProfile({ preferences: null });
      const updated = makeProfile({
        tags: ['premium'],
        preferences: { notes: 'Updated notes' },
      });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      await service.update(TENANT_ID, PROFILE_ID, {
        tags: ['premium'],
        notes: 'Updated notes',
      });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ['premium'],
            preferences: { notes: 'Updated notes' },
          }),
        }),
      );
    });

    it('should not include tags in updateData when tags is undefined', async () => {
      const existing = makeProfile({ preferences: null });
      const updated = makeProfile({
        preferences: { notes: 'Some note' },
      });

      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(updated);

      await service.update(TENANT_ID, PROFILE_ID, { notes: 'Some note' });

      const updateCall = prisma.clientProfile.update.mock.calls[0]![0];
      expect(updateCall.data).not.toHaveProperty('tags');
      expect(updateCall.data.preferences).toEqual({ notes: 'Some note' });
    });

    it('should include client relation in update response', async () => {
      const existing = makeProfile();
      prisma.clientProfile.findFirst.mockResolvedValue(existing);
      prisma.clientProfile.update.mockResolvedValue(existing);

      await service.update(TENANT_ID, PROFILE_ID, { tags: ['vip'] });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    const createDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
      tags: ['vip'],
      notes: 'Referred by John',
    };

    it('should create new user and profile when email does not exist', async () => {
      const newUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
      };
      const newProfile = makeProfile({
        clientId: USER_ID,
        client: {
          id: USER_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
        },
      });

      prisma.user.findUnique.mockResolvedValue(null); // no existing user
      prisma.user.create.mockResolvedValue(newUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null); // no existing profile
      prisma.clientProfile.create.mockResolvedValue(newProfile);

      const result = await service.create(TENANT_ID, createDto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'jane@example.com',
          name: 'Jane Doe',
          phone: '+1234567890',
        },
      });
      expect(prisma.clientProfile.create).toHaveBeenCalled();
      expect(result.id).toBe(PROFILE_ID);
    });

    it('should reuse existing user when email already exists', async () => {
      const existingUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
      };
      const newProfile = makeProfile({
        clientId: USER_ID,
        client: {
          id: USER_ID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
        },
      });

      prisma.user.findUnique.mockResolvedValue(existingUser); // user already exists
      prisma.clientProfile.findUnique.mockResolvedValue(null); // no existing profile
      prisma.clientProfile.create.mockResolvedValue(newProfile);

      const result = await service.create(TENANT_ID, createDto);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.clientProfile.create).toHaveBeenCalled();
      expect(result.id).toBe(PROFILE_ID);
    });

    it('should throw ConflictException when profile already exists for tenant+client', async () => {
      const existingUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
      };
      const existingProfile = makeProfile({ clientId: USER_ID });

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.clientProfile.findUnique.mockResolvedValue(existingProfile);

      await expect(
        service.create(TENANT_ID, createDto),
      ).rejects.toThrow(ConflictException);

      expect(prisma.clientProfile.create).not.toHaveBeenCalled();
    });

    it('should store tags correctly', async () => {
      const newUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      };
      const newProfile = makeProfile({ clientId: USER_ID, tags: ['vip', 'premium'] });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(newProfile);

      await service.create(TENANT_ID, {
        name: 'Jane Doe',
        email: 'jane@example.com',
        tags: ['vip', 'premium'],
      });

      expect(prisma.clientProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ['vip', 'premium'],
          }),
        }),
      );
    });

    it('should store notes in preferences JSON', async () => {
      const newUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      };
      const newProfile = makeProfile({
        clientId: USER_ID,
        preferences: { notes: 'Referred by John' },
      });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(newProfile);

      await service.create(TENANT_ID, {
        name: 'Jane Doe',
        email: 'jane@example.com',
        notes: 'Referred by John',
      });

      expect(prisma.clientProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: { notes: 'Referred by John' },
          }),
        }),
      );
    });

    it('should not include preferences when notes are empty', async () => {
      const newUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      };
      const newProfile = makeProfile({ clientId: USER_ID });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(newProfile);

      await service.create(TENANT_ID, {
        name: 'Jane Doe',
        email: 'jane@example.com',
        // no notes, no tags
      });

      const createCall = prisma.clientProfile.create.mock.calls[0]![0];
      expect(createCall.data.preferences).toBeUndefined();
      expect(createCall.data.tags).toBeUndefined();
    });

    it('should set phone to null when not provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      });
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(makeProfile({ clientId: USER_ID }));

      await service.create(TENANT_ID, {
        name: 'Jane Doe',
        email: 'jane@example.com',
        // no phone
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'jane@example.com',
          name: 'Jane Doe',
          phone: null,
        },
      });
    });

    it('should use correct tenant+client unique constraint for duplicate check', async () => {
      const existingUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(makeProfile({ clientId: USER_ID }));

      await service.create(TENANT_ID, createDto);

      expect(prisma.clientProfile.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_clientId: {
            tenantId: TENANT_ID,
            clientId: USER_ID,
          },
        },
      });
    });

    it('should include client relation in create response', async () => {
      const newUser = {
        id: USER_ID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.clientProfile.create.mockResolvedValue(makeProfile({ clientId: USER_ID }));

      await service.create(TENANT_ID, createDto);

      expect(prisma.clientProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
      );
    });
  });
});
