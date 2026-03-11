import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingController } from '@/messaging/messaging.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const THREAD_ID = 'thread-001';

const makeService = () => ({
  listThreads: vi.fn(),
  createThread: vi.fn(),
  getThread: vi.fn(),
  sendMessage: vi.fn(),
  markThreadRead: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MessagingController', () => {
  let controller: MessagingController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new MessagingController(service as never);
  });

  // -----------------------------------------------------------------------
  // listThreads
  // -----------------------------------------------------------------------

  describe('listThreads', () => {
    it('should delegate to service with parsed pagination', async () => {
      service.listThreads.mockResolvedValue({ data: [], meta: {} });

      await controller.listThreads(TENANT_ID, USER_ID, '2', '10');

      expect(service.listThreads).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        2,
        10,
      );
    });

    it('should pass undefined for missing pagination params', async () => {
      service.listThreads.mockResolvedValue({ data: [], meta: {} });

      await controller.listThreads(TENANT_ID, USER_ID);

      expect(service.listThreads).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        undefined,
        undefined,
      );
    });
  });

  // -----------------------------------------------------------------------
  // createThread
  // -----------------------------------------------------------------------

  describe('createThread', () => {
    it('should delegate to service with tenantId and userId', async () => {
      const dto = { participantIds: ['user-002'], body: 'Hello' };
      service.createThread.mockResolvedValue({ id: THREAD_ID });

      const result = await controller.createThread(TENANT_ID, USER_ID, dto);

      expect(service.createThread).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual({ id: THREAD_ID });
    });
  });

  // -----------------------------------------------------------------------
  // getThread
  // -----------------------------------------------------------------------

  describe('getThread', () => {
    it('should delegate to service with tenantId and threadId', async () => {
      service.getThread.mockResolvedValue({ id: THREAD_ID });

      const result = await controller.getThread(TENANT_ID, THREAD_ID);

      expect(service.getThread).toHaveBeenCalledWith(TENANT_ID, THREAD_ID);
      expect(result).toEqual({ id: THREAD_ID });
    });
  });

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  describe('sendMessage', () => {
    it('should delegate to service with all params', async () => {
      const dto = { body: 'New message' };
      service.sendMessage.mockResolvedValue({ id: 'msg-001' });

      const result = await controller.sendMessage(
        TENANT_ID,
        THREAD_ID,
        USER_ID,
        dto,
      );

      expect(service.sendMessage).toHaveBeenCalledWith(
        TENANT_ID,
        THREAD_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual({ id: 'msg-001' });
    });
  });

  // -----------------------------------------------------------------------
  // markThreadRead
  // -----------------------------------------------------------------------

  describe('markThreadRead', () => {
    it('should delegate to service with all params', async () => {
      service.markThreadRead.mockResolvedValue({ markedRead: 3 });

      const result = await controller.markThreadRead(
        TENANT_ID,
        THREAD_ID,
        USER_ID,
      );

      expect(service.markThreadRead).toHaveBeenCalledWith(
        TENANT_ID,
        THREAD_ID,
        USER_ID,
      );
      expect(result).toEqual({ markedRead: 3 });
    });
  });
});
