import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MessagingService } from '@/messaging/messaging.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const THREAD_ID = 'thread-001';
const MESSAGE_ID = 'msg-001';

function makePrisma() {
  return {
    messageThread: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    messageReadStatus: {
      createMany: vi.fn(),
    },
  };
}

function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: THREAD_ID,
    tenantId: TENANT_ID,
    subject: 'Test Thread',
    priority: 'NORMAL',
    status: 'OPEN',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new MessagingService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listThreads
  // -----------------------------------------------------------------------

  describe('listThreads', () => {
    it('should return paginated threads with meta', async () => {
      const threads = [
        {
          ...makeThread(),
          messages: [{ id: MESSAGE_ID, body: 'Hello', senderId: USER_ID, createdAt: new Date() }],
        },
      ];
      prisma.messageThread.findMany.mockResolvedValue(threads);
      prisma.messageThread.count.mockResolvedValue(1);

      const result = await service.listThreads(TENANT_ID, USER_ID);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('lastMessage');
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply pagination parameters', async () => {
      prisma.messageThread.findMany.mockResolvedValue([]);
      prisma.messageThread.count.mockResolvedValue(0);

      await service.listThreads(TENANT_ID, USER_ID, 3, 10);

      const args = prisma.messageThread.findMany.mock.calls[0]![0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // createThread
  // -----------------------------------------------------------------------

  describe('createThread', () => {
    it('should create thread with first message', async () => {
      const thread = {
        ...makeThread(),
        messages: [{ id: MESSAGE_ID, senderId: USER_ID, body: 'Hello', createdAt: new Date() }],
      };
      prisma.messageThread.create.mockResolvedValue(thread);

      const result = await service.createThread(TENANT_ID, USER_ID, {
        participantIds: ['user-002'],
        subject: 'Test Thread',
        body: 'Hello',
      });

      expect(result).toEqual(thread);
      expect(prisma.messageThread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            subject: 'Test Thread',
            messages: {
              create: {
                senderId: USER_ID,
                body: 'Hello',
              },
            },
          }),
        }),
      );
    });

    it('should set subject to null when not provided', async () => {
      prisma.messageThread.create.mockResolvedValue({
        ...makeThread({ subject: null }),
        messages: [],
      });

      await service.createThread(TENANT_ID, USER_ID, {
        participantIds: ['user-002'],
        body: 'Hi',
      });

      const data = prisma.messageThread.create.mock.calls[0]![0].data;
      expect(data.subject).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getThread
  // -----------------------------------------------------------------------

  describe('getThread', () => {
    it('should return thread with messages', async () => {
      const thread = {
        ...makeThread(),
        messages: [
          {
            id: MESSAGE_ID,
            senderId: USER_ID,
            body: 'Hello',
            createdAt: new Date(),
            sender: { id: USER_ID, name: 'Test User', email: 'test@example.com' },
            readStatuses: [],
          },
        ],
      };
      prisma.messageThread.findFirst.mockResolvedValue(thread);

      const result = await service.getThread(TENANT_ID, THREAD_ID);

      expect(result).toEqual(thread);
    });

    it('should throw NotFoundException when thread not found', async () => {
      prisma.messageThread.findFirst.mockResolvedValue(null);

      await expect(service.getThread(TENANT_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  describe('sendMessage', () => {
    it('should create message and update thread updatedAt', async () => {
      prisma.messageThread.findFirst.mockResolvedValue(makeThread());
      const message = {
        id: MESSAGE_ID,
        threadId: THREAD_ID,
        senderId: USER_ID,
        body: 'New message',
        createdAt: new Date(),
        sender: { id: USER_ID, name: 'Test', email: 'test@example.com' },
      };
      prisma.message.create.mockResolvedValue(message);
      prisma.messageThread.update.mockResolvedValue(makeThread());

      const result = await service.sendMessage(TENANT_ID, THREAD_ID, USER_ID, {
        body: 'New message',
      });

      expect(result).toEqual(message);
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            threadId: THREAD_ID,
            senderId: USER_ID,
            body: 'New message',
          },
        }),
      );
      expect(prisma.messageThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: THREAD_ID },
        }),
      );
    });

    it('should throw NotFoundException when thread not found', async () => {
      prisma.messageThread.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage(TENANT_ID, 'bad-id', USER_ID, { body: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // markThreadRead
  // -----------------------------------------------------------------------

  describe('markThreadRead', () => {
    it('should create read statuses for unread messages', async () => {
      prisma.messageThread.findFirst.mockResolvedValue({
        ...makeThread(),
        messages: [
          { id: 'msg-1' },
          { id: 'msg-2' },
        ],
      });
      prisma.messageReadStatus.createMany.mockResolvedValue({ count: 2 });

      const result = await service.markThreadRead(TENANT_ID, THREAD_ID, USER_ID);

      expect(result).toEqual({ markedRead: 2 });
      expect(prisma.messageReadStatus.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
        }),
      );
    });

    it('should return 0 when no unread messages', async () => {
      prisma.messageThread.findFirst.mockResolvedValue({
        ...makeThread(),
        messages: [],
      });

      const result = await service.markThreadRead(TENANT_ID, THREAD_ID, USER_ID);

      expect(result).toEqual({ markedRead: 0 });
    });

    it('should throw NotFoundException when thread not found', async () => {
      prisma.messageThread.findFirst.mockResolvedValue(null);

      await expect(
        service.markThreadRead(TENANT_ID, 'bad-id', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
