import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CommunicationsComposeService } from '@/communications/communications-compose.service';
import { ComposeChannel } from '@/communications/dto/compose-message.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const COMM_ID = 'comm-001';

function makePrisma() {
  return {
    tenantMembership: {
      findFirst: vi.fn(),
    },
    communication: {
      create: vi.fn(),
    },
  };
}

function makeQueue() {
  return {
    add: vi.fn(),
    addBulk: vi.fn(),
  };
}

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-001',
    tenantId: TENANT_ID,
    userId: USER_ID,
    user: {
      id: USER_ID,
      email: 'john@example.com',
      phone: '+15551234567',
      name: 'John Doe',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CommunicationsComposeService', () => {
  let service: CommunicationsComposeService;
  let prisma: ReturnType<typeof makePrisma>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    queue = makeQueue();
    service = new CommunicationsComposeService(prisma as never, queue as never);
  });

  // -----------------------------------------------------------------------
  // compose - EMAIL channel
  // -----------------------------------------------------------------------

  describe('compose EMAIL', () => {
    it('should create email communication and enqueue delivery job', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(makeMembership());
      prisma.communication.create.mockResolvedValue({ id: COMM_ID });

      const result = await service.compose(TENANT_ID, {
        channel: ComposeChannel.EMAIL,
        recipientId: USER_ID,
        body: 'Hello!',
        subject: 'Test Subject',
      });

      expect(result).toEqual({ id: COMM_ID, status: 'QUEUED', channel: 'EMAIL' });
      expect(prisma.communication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            recipientId: USER_ID,
            channel: 'EMAIL',
            subject: 'Test Subject',
            body: 'Hello!',
            status: 'QUEUED',
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'deliverCommunication',
        { communicationId: COMM_ID, tenantId: TENANT_ID },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should throw BadRequestException when recipient not found in tenant', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.compose(TENANT_ID, {
          channel: ComposeChannel.EMAIL,
          recipientId: 'unknown-user',
          body: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email is missing for EMAIL channel', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(
        makeMembership({ user: { id: USER_ID, email: null, phone: null, name: 'No Email' } }),
      );

      await expect(
        service.compose(TENANT_ID, {
          channel: ComposeChannel.EMAIL,
          recipientId: USER_ID,
          body: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default subject when not provided', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(makeMembership());
      prisma.communication.create.mockResolvedValue({ id: COMM_ID });

      await service.compose(TENANT_ID, {
        channel: ComposeChannel.EMAIL,
        recipientId: USER_ID,
        body: 'Hello!',
      });

      expect(prisma.communication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'Message from your provider',
          }),
        }),
      );
    });

    it('should throw when recipientId is missing for email without direct email', async () => {
      await expect(
        service.compose(TENANT_ID, {
          channel: ComposeChannel.EMAIL,
          recipientEmail: 'test@example.com',
          body: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // compose - SMS channel
  // -----------------------------------------------------------------------

  describe('compose SMS', () => {
    it('should create SMS communication and enqueue delivery job', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(makeMembership());
      prisma.communication.create.mockResolvedValue({ id: COMM_ID });

      const result = await service.compose(TENANT_ID, {
        channel: ComposeChannel.SMS,
        recipientId: USER_ID,
        body: 'SMS body',
      });

      expect(result).toEqual({ id: COMM_ID, status: 'QUEUED', channel: 'SMS' });
      expect(queue.add).toHaveBeenCalledWith(
        'deliverProviderSMS',
        expect.objectContaining({
          communicationId: COMM_ID,
          tenantId: TENANT_ID,
          to: '+15551234567',
          body: 'SMS body',
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should throw BadRequestException when phone is missing for SMS channel', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(
        makeMembership({ user: { id: USER_ID, email: 'a@b.com', phone: null, name: 'No Phone' } }),
      );

      await expect(
        service.compose(TENANT_ID, {
          channel: ComposeChannel.SMS,
          recipientId: USER_ID,
          body: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when recipientId is missing for SMS without direct phone', async () => {
      await expect(
        service.compose(TENANT_ID, {
          channel: ComposeChannel.SMS,
          recipientPhone: '+15551111111',
          body: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // compose - invalid channel
  // -----------------------------------------------------------------------

  describe('compose invalid channel', () => {
    it('should throw BadRequestException for unsupported channel', async () => {
      await expect(
        service.compose(TENANT_ID, {
          channel: 'PUSH' as ComposeChannel,
          body: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
