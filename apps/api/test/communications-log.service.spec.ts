import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunicationsLogService } from '@/communications/communications-log.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    communication: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

function makeLogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comm-001',
    channel: 'EMAIL',
    templateKey: 'booking-confirmation',
    subject: 'Your booking is confirmed',
    status: 'DELIVERED',
    providerMessageId: 'msg-abc123',
    sentAt: new Date('2026-03-01T10:00:00Z'),
    deliveredAt: new Date('2026-03-01T10:01:00Z'),
    openedAt: null,
    failureReason: null,
    metadata: { recipientEmail: 'john@example.com' },
    createdAt: new Date('2026-03-01T09:59:00Z'),
    recipient: { id: 'user-001', name: 'John Doe', email: 'john@example.com' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CommunicationsLogService', () => {
  let service: CommunicationsLogService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CommunicationsLogService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // getLog
  // -----------------------------------------------------------------------

  describe('getLog', () => {
    it('should return paginated log items with metadata', async () => {
      const items = [makeLogItem()];
      prisma.communication.findMany.mockResolvedValue(items);
      prisma.communication.count.mockResolvedValue(1);

      const result = await service.getLog(TENANT_ID, { page: 1, limit: 20 });

      expect(result.items).toEqual(items);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should calculate correct skip offset for pagination', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(100);

      await service.getLog(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should filter by channel when provided', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      await service.getLog(TENANT_ID, { page: 1, limit: 20, channel: 'SMS' });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: 'SMS' }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      await service.getLog(TENANT_ID, { page: 1, limit: 20, status: 'FAILED' });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('should filter by clientId when provided', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      await service.getLog(TENANT_ID, {
        page: 1,
        limit: 20,
        clientId: 'client-001',
      });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recipientId: 'client-001' }),
        }),
      );
    });

    it('should not include optional filters when not provided', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      await service.getLog(TENANT_ID, { page: 1, limit: 20 });

      const calledWith = prisma.communication.findMany.mock.calls[0]![0];
      expect(calledWith.where).toEqual({ tenantId: TENANT_ID });
    });

    it('should calculate totalPages correctly with rounding up', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(21);

      const result = await service.getLog(TENANT_ID, { page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return zero totalPages when no items exist', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      const result = await service.getLog(TENANT_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(0);
    });

    it('should combine multiple filters', async () => {
      prisma.communication.findMany.mockResolvedValue([]);
      prisma.communication.count.mockResolvedValue(0);

      await service.getLog(TENANT_ID, {
        page: 1,
        limit: 10,
        channel: 'EMAIL',
        status: 'DELIVERED',
        clientId: 'client-002',
      });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            channel: 'EMAIL',
            status: 'DELIVERED',
            recipientId: 'client-002',
          },
        }),
      );
    });
  });
});
