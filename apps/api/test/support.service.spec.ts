import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupportService } from '@/support/support.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const TENANT_ID = 'tenant-001';
const TICKET_ID = 'ticket-001';

function makePrisma() {
  return {
    supportTicket: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    tenantId: TENANT_ID,
    submittedBy: USER_ID,
    category: 'BUG',
    severity: 'MEDIUM',
    subject: 'Cannot complete checkout',
    body: 'When I try to complete checkout the page freezes and nothing happens.',
    status: 'NEW',
    aiDiagnosis: null,
    aiResponse: null,
    aiResolutionType: null,
    resolvedBy: null,
    resolvedAt: null,
    developerNotes: null,
    sourceContext: null,
    userSatisfaction: null,
    relatedTicketId: null,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SupportService', () => {
  let service: SupportService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SupportService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // createTicket
  // -----------------------------------------------------------------------

  describe('createTicket', () => {
    it('should create a ticket with correct fields', async () => {
      const ticket = makeTicket();
      prisma.supportTicket.create.mockResolvedValue(ticket);

      const result = await service.createTicket(USER_ID, TENANT_ID, {
        category: 'BUG',
        subject: 'Cannot complete checkout',
        body: 'When I try to complete checkout the page freezes and nothing happens.',
        severity: 'HIGH',
        sourceContext: { page: '/bookings/123' },
      });

      expect(result).toEqual(ticket);
      expect(prisma.supportTicket.create).toHaveBeenCalledWith({
        data: {
          submittedBy: USER_ID,
          tenantId: TENANT_ID,
          category: 'BUG',
          severity: 'HIGH',
          subject: 'Cannot complete checkout',
          body: 'When I try to complete checkout the page freezes and nothing happens.',
          status: 'NEW',
          sourceContext: { page: '/bookings/123' },
        },
      });
    });

    it('should default severity to MEDIUM when not provided', async () => {
      const ticket = makeTicket({ severity: 'MEDIUM' });
      prisma.supportTicket.create.mockResolvedValue(ticket);

      await service.createTicket(USER_ID, TENANT_ID, {
        category: 'QUESTION',
        subject: 'How do I reschedule?',
        body: 'I need to reschedule my appointment but cannot find the option.',
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'MEDIUM',
        }),
      });
    });

    it('should set tenantId to null when tenant context is null', async () => {
      const ticket = makeTicket({ tenantId: null });
      prisma.supportTicket.create.mockResolvedValue(ticket);

      await service.createTicket(USER_ID, null, {
        category: 'ACCOUNT_ISSUE',
        subject: 'Cannot login to my account',
        body: 'I keep getting a login error when trying to access my account.',
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: null,
        }),
      });
    });

    it('should pass sourceContext when provided', async () => {
      const ticket = makeTicket({
        sourceContext: { page: '/bookings/123', error: 'timeout' },
      });
      prisma.supportTicket.create.mockResolvedValue(ticket);

      await service.createTicket(USER_ID, TENANT_ID, {
        category: 'BUG',
        subject: 'Checkout timeout error',
        body: 'The checkout page times out after about 30 seconds of loading.',
        sourceContext: { page: '/bookings/123', error: 'timeout' },
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceContext: { page: '/bookings/123', error: 'timeout' },
        }),
      });
    });

    it('should not include sourceContext when not provided', async () => {
      const ticket = makeTicket();
      prisma.supportTicket.create.mockResolvedValue(ticket);

      await service.createTicket(USER_ID, TENANT_ID, {
        category: 'BUG',
        subject: 'General bug report',
        body: 'Something is wrong with the application that I cannot describe well.',
      });

      const createCall = prisma.supportTicket.create.mock.calls[0]![0];
      expect(createCall.data.sourceContext).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // listTickets
  // -----------------------------------------------------------------------

  describe('listTickets', () => {
    it('should return tickets for the user ordered by createdAt desc', async () => {
      const tickets = [
        makeTicket({
          id: 'ticket-002',
          createdAt: new Date('2026-03-02T10:00:00Z'),
        }),
        makeTicket({
          id: 'ticket-001',
          createdAt: new Date('2026-03-01T10:00:00Z'),
        }),
      ];
      prisma.supportTicket.findMany.mockResolvedValue(tickets);

      const result = await service.listTickets(USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('ticket-002');
      expect(result[1]!.id).toBe('ticket-001');
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith({
        where: { submittedBy: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no tickets', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([]);

      const result = await service.listTickets(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getTicket
  // -----------------------------------------------------------------------

  describe('getTicket', () => {
    it('should return the ticket when user is the submitter', async () => {
      const ticket = makeTicket();
      prisma.supportTicket.findUnique.mockResolvedValue(ticket);

      const result = await service.getTicket(USER_ID, TICKET_ID);

      expect(result).toEqual(ticket);
      expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith({
        where: { id: TICKET_ID },
      });
    });

    it('should throw ForbiddenException when user is not the submitter', async () => {
      const ticket = makeTicket({ submittedBy: OTHER_USER_ID });
      prisma.supportTicket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.getTicket(USER_ID, TICKET_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for unknown ticket ID', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.getTicket(USER_ID, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
