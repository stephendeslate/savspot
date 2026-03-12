import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '@/notifications/notifications.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const NOTIFICATION_ID = 'notif-001';
const TYPE_ID = 'type-001';

function makePrisma() {
  return {
    notificationType: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  };
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIFICATION_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    typeId: TYPE_ID,
    title: 'Test Notification',
    body: 'This is a test',
    data: null,
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-03-01T12:00:00Z'),
    notificationType: {
      key: 'booking.general',
      category: 'BOOKING',
      priority: 'NORMAL',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    service = new NotificationsService(prisma as never, redis as never);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should generate typeKey from category (e.g., BOOKING -> booking.general)', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Booking Confirmed',
        body: 'Your booking has been confirmed.',
        category: 'BOOKING',
      });

      expect(prisma.notificationType.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'booking.general' },
        }),
      );
    });

    it('should generate typeKey for PAYMENT category as payment.general', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'payment.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Payment Received',
        body: 'Payment of $50 received.',
        category: 'PAYMENT',
      });

      expect(prisma.notificationType.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'payment.general' },
        }),
      );
    });

    it('should generate typeKey for SYSTEM category as system.general', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'system.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'System Update',
        body: 'Maintenance scheduled.',
        category: 'SYSTEM',
      });

      expect(prisma.notificationType.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'system.general' },
        }),
      );
    });

    it('should upsert NotificationType with correct name and description', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Test',
        body: 'Test body',
        category: 'BOOKING',
      });

      expect(prisma.notificationType.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            key: 'booking.general',
            name: 'BOOKING Notification',
            category: 'BOOKING',
            priority: 'NORMAL',
            defaultChannels: ['IN_APP'],
            isSystem: true,
          }),
          update: {},
        }),
      );
    });

    it('should use provided priority when specified', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Urgent',
        body: 'Critical issue.',
        category: 'BOOKING',
        priority: 'CRITICAL',
      });

      expect(prisma.notificationType.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            priority: 'CRITICAL',
          }),
        }),
      );
    });

    it('should pass metadata as Prisma.InputJsonValue when provided', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification({ data: { bookingId: 'b-1' } }));

      const metadata = { bookingId: 'b-1', extra: 42 };

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Test',
        body: 'Body',
        category: 'BOOKING',
        metadata,
      });

      const createCall = prisma.notification.create.mock.calls[0]![0];
      expect(createCall.data.data).toEqual(metadata);
    });

    it('should pass Prisma.JsonNull when metadata is undefined', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Test',
        body: 'Body',
        category: 'BOOKING',
        // metadata intentionally omitted
      });

      const createCall = prisma.notification.create.mock.calls[0]![0];
      // When metadata is undefined, `undefined as Prisma.InputJsonValue ?? Prisma.JsonNull`
      // evaluates to Prisma.JsonNull. We check it is the DbNull/JsonNull sentinel.
      expect(createCall.data.data).toBeDefined();
    });

    it('should create notification with correct tenantId, userId, typeId, and title', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Booking Confirmed',
        body: 'Your booking is confirmed.',
        category: 'BOOKING',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            typeId: TYPE_ID,
            title: 'Booking Confirmed',
            body: 'Your booking is confirmed.',
          }),
        }),
      );
    });

    it('should include notificationType in the create response', async () => {
      prisma.notificationType.upsert.mockResolvedValue({ id: TYPE_ID, key: 'booking.general' });
      prisma.notification.create.mockResolvedValue(makeNotification());

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        title: 'Test',
        body: 'Body',
        category: 'BOOKING',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            notificationType: {
              select: { key: true, category: true, priority: true },
            },
          },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated results with correct meta', async () => {
      prisma.notification.findMany.mockResolvedValue([makeNotification()]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, USER_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should calculate totalPages correctly', async () => {
      prisma.notification.findMany.mockResolvedValue([makeNotification()]);
      prisma.notification.count.mockResolvedValue(45);

      const result = await service.findAll(TENANT_ID, USER_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3); // Math.ceil(45/20) = 3
    });

    it('should use default page=1 and limit=20 when options not provided', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, USER_ID);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by unread when unread=true', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, USER_ID, { unread: true });

      const where = prisma.notification.findMany.mock.calls[0]![0].where;
      expect(where.isRead).toBe(false);
    });

    it('should not add isRead filter when unread is not set', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, USER_ID, { page: 1, limit: 10 });

      const where = prisma.notification.findMany.mock.calls[0]![0].where;
      expect(where.isRead).toBeUndefined();
    });

    it('should apply skip/take for pagination', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, USER_ID, { page: 3, limit: 10 });

      const findManyArgs = prisma.notification.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(20); // (3-1)*10
      expect(findManyArgs.take).toBe(10);
    });

    it('should order by createdAt desc', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, USER_ID);

      const findManyArgs = prisma.notification.findMany.mock.calls[0]![0];
      expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // -----------------------------------------------------------------------
  // getUnreadCount
  // -----------------------------------------------------------------------

  describe('getUnreadCount', () => {
    it('should return unread count as a number', async () => {
      prisma.notification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount(TENANT_ID, USER_ID);

      expect(result).toBe(7);
    });

    it('should filter by tenantId, userId, and isRead=false', async () => {
      prisma.notification.count.mockResolvedValue(0);

      await service.getUnreadCount(TENANT_ID, USER_ID);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          userId: USER_ID,
          isRead: false,
        },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(TENANT_ID, USER_ID);

      expect(result).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // markRead
  // -----------------------------------------------------------------------

  describe('markRead', () => {
    it('should throw NotFoundException when notification not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markRead('bad-id', USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should return early without updating when already read', async () => {
      const alreadyRead = makeNotification({
        isRead: true,
        readAt: new Date('2026-03-01T14:00:00Z'),
      });
      prisma.notification.findFirst.mockResolvedValue(alreadyRead);

      const result = await service.markRead(NOTIFICATION_ID, USER_ID);

      expect(result).toBe(alreadyRead);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('should update isRead=true and readAt when marking unread notification', async () => {
      const unread = makeNotification({ isRead: false, readAt: null });
      prisma.notification.findFirst.mockResolvedValue(unread);

      const updated = makeNotification({ isRead: true, readAt: new Date() });
      prisma.notification.update.mockResolvedValue(updated);

      const result = await service.markRead(NOTIFICATION_ID, USER_ID);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
      expect(result.isRead).toBe(true);
    });

    it('should look up notification by both id and userId', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markRead(NOTIFICATION_ID, USER_ID)).rejects.toThrow();

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID, userId: USER_ID },
      });
    });
  });

  // -----------------------------------------------------------------------
  // markAllRead
  // -----------------------------------------------------------------------

  describe('markAllRead', () => {
    it('should update all unread notifications for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead(TENANT_ID, USER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          userId: USER_ID,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ count: 5 });
    });

    it('should return count of 0 when no unread notifications exist', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllRead(TENANT_ID, USER_ID);

      expect(result).toEqual({ count: 0 });
    });

    it('should scope the update to the specific tenant and user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });

      await service.markAllRead('tenant-999', 'user-999');

      const where = prisma.notification.updateMany.mock.calls[0]![0].where;
      expect(where.tenantId).toBe('tenant-999');
      expect(where.userId).toBe('user-999');
    });
  });
});
