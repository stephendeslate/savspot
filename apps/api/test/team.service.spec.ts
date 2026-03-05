import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TeamService } from '@/team/team.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const INVITATION_ID = 'invitation-001';
const SERVICE_ID_1 = 'service-001';
const SERVICE_ID_2 = 'service-002';

function makePrisma() {
  return {
    tenantMembership: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    teamInvitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    serviceProvider: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-001',
    tenantId: TENANT_ID,
    userId: USER_ID,
    role: 'OWNER',
    permissions: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    user: {
      id: USER_ID,
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    },
    ...overrides,
  };
}

function makeInvitation(overrides: Record<string, unknown> = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: INVITATION_ID,
    tenantId: TENANT_ID,
    invitedBy: USER_ID,
    inviteeEmail: 'newmember@example.com',
    role: 'STAFF',
    token: 'test-token-uuid',
    status: 'PENDING',
    expiresAt,
    acceptedAt: null,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TeamService', () => {
  let service: TeamService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new TeamService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listMembers
  // -----------------------------------------------------------------------

  describe('listMembers', () => {
    it('should return membership data with user info', async () => {
      const members = [
        makeMembership(),
        makeMembership({
          id: 'membership-002',
          userId: OTHER_USER_ID,
          role: 'STAFF',
          user: {
            id: OTHER_USER_ID,
            name: 'Jane Smith',
            email: 'jane@example.com',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        }),
      ];
      prisma.tenantMembership.findMany.mockResolvedValue(members);

      const result = await service.listMembers(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.user.name).toBe('John Doe');
      expect(result[1]!.user.name).toBe('Jane Smith');
      expect(prisma.tenantMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        }),
      );
    });

    it('should return empty array when no members', async () => {
      prisma.tenantMembership.findMany.mockResolvedValue([]);

      const result = await service.listMembers(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // listInvitations
  // -----------------------------------------------------------------------

  describe('listInvitations', () => {
    it('should return pending invitations', async () => {
      const invitations = [makeInvitation()];
      prisma.teamInvitation.findMany.mockResolvedValue(invitations);

      const result = await service.listInvitations(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe('PENDING');
      expect(prisma.teamInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'PENDING' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // inviteMember
  // -----------------------------------------------------------------------

  describe('inviteMember', () => {
    it('should create invitation with correct fields', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(null);
      prisma.teamInvitation.findFirst.mockResolvedValue(null);

      const createdInvitation = makeInvitation();
      prisma.teamInvitation.create.mockResolvedValue(createdInvitation);

      const result = await service.inviteMember(TENANT_ID, USER_ID, {
        email: 'newmember@example.com',
        role: 'STAFF',
      });

      expect(result.inviteeEmail).toBe('newmember@example.com');
      expect(prisma.teamInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          invitedBy: USER_ID,
          inviteeEmail: 'newmember@example.com',
          role: 'STAFF',
          status: 'PENDING',
        }),
      });

      // Verify expiresAt is ~7 days in the future
      const createCall = prisma.teamInvitation.create.mock.calls[0]![0];
      const expiresAt = createCall.data.expiresAt as Date;
      const now = new Date();
      const sixDays = 6 * 24 * 60 * 60 * 1000;
      const eightDays = 8 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime() - now.getTime()).toBeGreaterThan(sixDays);
      expect(expiresAt.getTime() - now.getTime()).toBeLessThan(eightDays);

      // Verify token is a UUID
      const token = createCall.data.token as string;
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should reject if email is already a member', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(
        makeMembership({ user: { email: 'existing@example.com' } }),
      );

      await expect(
        service.inviteMember(TENANT_ID, USER_ID, {
          email: 'existing@example.com',
          role: 'STAFF',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.teamInvitation.create).not.toHaveBeenCalled();
    });

    it('should reject if pending invitation already exists for email', async () => {
      prisma.tenantMembership.findFirst.mockResolvedValue(null);
      prisma.teamInvitation.findFirst.mockResolvedValue(makeInvitation());

      await expect(
        service.inviteMember(TENANT_ID, USER_ID, {
          email: 'newmember@example.com',
          role: 'STAFF',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.teamInvitation.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // revokeInvitation
  // -----------------------------------------------------------------------

  describe('revokeInvitation', () => {
    it('should mark invitation as REVOKED', async () => {
      prisma.teamInvitation.findFirst.mockResolvedValue(makeInvitation());
      prisma.teamInvitation.update.mockResolvedValue(
        makeInvitation({ status: 'REVOKED' }),
      );

      const result = await service.revokeInvitation(TENANT_ID, INVITATION_ID);

      expect(result.status).toBe('REVOKED');
      expect(prisma.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: INVITATION_ID },
        data: { status: 'REVOKED' },
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      prisma.teamInvitation.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeInvitation(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // updateMemberRole
  // -----------------------------------------------------------------------

  describe('updateMemberRole', () => {
    it('should update membership role', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'STAFF', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.update.mockResolvedValue(
        makeMembership({ role: 'ADMIN', userId: OTHER_USER_ID }),
      );

      const result = await service.updateMemberRole(
        TENANT_ID,
        OTHER_USER_ID,
        'ADMIN' as never,
        USER_ID,
      );

      expect(result.role).toBe('ADMIN');
      expect(prisma.tenantMembership.update).toHaveBeenCalledWith({
        where: {
          tenantId_userId: { tenantId: TENANT_ID, userId: OTHER_USER_ID },
        },
        data: { role: 'ADMIN' },
      });
    });

    it('should throw BadRequestException when changing own role', async () => {
      await expect(
        service.updateMemberRole(
          TENANT_ID,
          USER_ID,
          'STAFF' as never,
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when member not found', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(
          TENANT_ID,
          'nonexistent',
          'ADMIN' as never,
          USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting last OWNER', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'OWNER', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.count.mockResolvedValue(1); // only one OWNER

      await expect(
        service.updateMemberRole(
          TENANT_ID,
          OTHER_USER_ID,
          'ADMIN' as never,
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.update).not.toHaveBeenCalled();
    });

    it('should allow demoting OWNER when another OWNER exists', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'OWNER', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.count.mockResolvedValue(2); // two OWNERs
      prisma.tenantMembership.update.mockResolvedValue(
        makeMembership({ role: 'ADMIN', userId: OTHER_USER_ID }),
      );

      const result = await service.updateMemberRole(
        TENANT_ID,
        OTHER_USER_ID,
        'ADMIN' as never,
        USER_ID,
      );

      expect(result.role).toBe('ADMIN');
    });
  });

  // -----------------------------------------------------------------------
  // removeMember
  // -----------------------------------------------------------------------

  describe('removeMember', () => {
    it('should delete membership', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'STAFF', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.delete.mockResolvedValue(
        makeMembership({ role: 'STAFF', userId: OTHER_USER_ID }),
      );

      const result = await service.removeMember(
        TENANT_ID,
        OTHER_USER_ID,
        USER_ID,
      );

      expect(result.userId).toBe(OTHER_USER_ID);
      expect(prisma.tenantMembership.delete).toHaveBeenCalledWith({
        where: {
          tenantId_userId: { tenantId: TENANT_ID, userId: OTHER_USER_ID },
        },
      });
    });

    it('should throw BadRequestException when removing self', async () => {
      await expect(
        service.removeMember(TENANT_ID, USER_ID, USER_ID),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when member not found', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(TENANT_ID, 'nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removing last OWNER', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'OWNER', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.count.mockResolvedValue(1); // only one OWNER

      await expect(
        service.removeMember(TENANT_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.delete).not.toHaveBeenCalled();
    });

    it('should allow removing OWNER when another OWNER exists', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(
        makeMembership({ role: 'OWNER', userId: OTHER_USER_ID }),
      );
      prisma.tenantMembership.count.mockResolvedValue(2); // two OWNERs
      prisma.tenantMembership.delete.mockResolvedValue(
        makeMembership({ role: 'OWNER', userId: OTHER_USER_ID }),
      );

      const result = await service.removeMember(
        TENANT_ID,
        OTHER_USER_ID,
        USER_ID,
      );

      expect(result.userId).toBe(OTHER_USER_ID);
    });
  });

  // -----------------------------------------------------------------------
  // assignServices
  // -----------------------------------------------------------------------

  describe('assignServices', () => {
    it('should replace ServiceProvider records', async () => {
      prisma.serviceProvider.deleteMany.mockResolvedValue({ count: 1 });
      prisma.serviceProvider.createMany.mockResolvedValue({ count: 2 });
      prisma.serviceProvider.findMany.mockResolvedValue([
        {
          serviceId: SERVICE_ID_1,
          userId: USER_ID,
          tenantId: TENANT_ID,
          service: { id: SERVICE_ID_1, name: 'Haircut', durationMinutes: 30 },
        },
        {
          serviceId: SERVICE_ID_2,
          userId: USER_ID,
          tenantId: TENANT_ID,
          service: { id: SERVICE_ID_2, name: 'Coloring', durationMinutes: 60 },
        },
      ]);

      const result = await service.assignServices(TENANT_ID, USER_ID, [
        SERVICE_ID_1,
        SERVICE_ID_2,
      ]);

      expect(prisma.serviceProvider.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID },
      });
      expect(prisma.serviceProvider.createMany).toHaveBeenCalledWith({
        data: [
          { serviceId: SERVICE_ID_1, userId: USER_ID, tenantId: TENANT_ID },
          { serviceId: SERVICE_ID_2, userId: USER_ID, tenantId: TENANT_ID },
        ],
      });
      expect(result).toHaveLength(2);
    });

    it('should handle empty service IDs (remove all)', async () => {
      prisma.serviceProvider.deleteMany.mockResolvedValue({ count: 2 });
      prisma.serviceProvider.findMany.mockResolvedValue([]);

      const result = await service.assignServices(TENANT_ID, USER_ID, []);

      expect(prisma.serviceProvider.deleteMany).toHaveBeenCalled();
      expect(prisma.serviceProvider.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getAssignedServices
  // -----------------------------------------------------------------------

  describe('getAssignedServices', () => {
    it('should return service provider records with service details', async () => {
      prisma.serviceProvider.findMany.mockResolvedValue([
        {
          serviceId: SERVICE_ID_1,
          userId: USER_ID,
          tenantId: TENANT_ID,
          service: { id: SERVICE_ID_1, name: 'Haircut', durationMinutes: 30 },
        },
      ]);

      const result = await service.getAssignedServices(TENANT_ID, USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.service.name).toBe('Haircut');
    });
  });

  // -----------------------------------------------------------------------
  // acceptInvitation
  // -----------------------------------------------------------------------

  describe('acceptInvitation', () => {
    it('should accept valid invitation and create membership', async () => {
      const invitation = makeInvitation();
      prisma.teamInvitation.findUnique.mockResolvedValue(invitation);
      prisma.user.findUnique.mockResolvedValue({
        id: OTHER_USER_ID,
        email: 'newmember@example.com',
      });
      const createdMembership = makeMembership({
        userId: OTHER_USER_ID,
        role: 'STAFF',
      });
      prisma.tenantMembership.create.mockResolvedValue(createdMembership);
      prisma.teamInvitation.update.mockResolvedValue(
        makeInvitation({ status: 'ACCEPTED' }),
      );

      const result = await service.acceptInvitation('test-token-uuid');

      expect(result.userId).toBe(OTHER_USER_ID);
      expect(result.role).toBe('STAFF');
      expect(prisma.tenantMembership.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          userId: OTHER_USER_ID,
          role: 'STAFF',
        },
      });
      expect(prisma.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: INVITATION_ID },
        data: {
          status: 'ACCEPTED',
          acceptedAt: expect.any(Date),
        },
      });
    });

    it('should create user when email does not exist', async () => {
      const invitation = makeInvitation();
      prisma.teamInvitation.findUnique.mockResolvedValue(invitation);
      prisma.user.findUnique.mockResolvedValue(null); // no existing user
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newmember@example.com',
      });
      prisma.tenantMembership.create.mockResolvedValue(
        makeMembership({ userId: 'new-user-id', role: 'STAFF' }),
      );
      prisma.teamInvitation.update.mockResolvedValue(
        makeInvitation({ status: 'ACCEPTED' }),
      );

      const result = await service.acceptInvitation('test-token-uuid');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'newmember@example.com', name: 'newmember' },
      });
      expect(result.userId).toBe('new-user-id');
    });

    it('should reject expired token', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // expired yesterday
      const invitation = makeInvitation({ expiresAt: expiredDate });
      prisma.teamInvitation.findUnique.mockResolvedValue(invitation);

      await expect(
        service.acceptInvitation('test-token-uuid'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.create).not.toHaveBeenCalled();
    });

    it('should reject already accepted token', async () => {
      const invitation = makeInvitation({ status: 'ACCEPTED' });
      prisma.teamInvitation.findUnique.mockResolvedValue(invitation);

      await expect(
        service.acceptInvitation('test-token-uuid'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.create).not.toHaveBeenCalled();
    });

    it('should reject revoked token', async () => {
      const invitation = makeInvitation({ status: 'REVOKED' });
      prisma.teamInvitation.findUnique.mockResolvedValue(invitation);

      await expect(
        service.acceptInvitation('test-token-uuid'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenantMembership.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when token not found', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('nonexistent-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
