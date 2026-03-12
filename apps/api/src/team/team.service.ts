import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TenantRole, InvitationStatus } from '../../../../prisma/generated/prisma';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * List all team members (TenantMembership records) for a tenant,
   * including user name, email, and avatarUrl.
   */
  async listMembers(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { tenantId },
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
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * List pending team invitations for a tenant.
   */
  async listInvitations(tenantId: string) {
    return this.prisma.teamInvitation.findMany({
      where: {
        tenantId,
        status: InvitationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a team invitation.
   * Checks that the email is not already a member and has no pending invitation.
   */
  async inviteMember(
    tenantId: string,
    invitedBy: string,
    dto: InviteMemberDto,
  ) {
    // Check if email already belongs to a member of this tenant
    const existingMember = await this.prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'A user with this email is already a member of this tenant',
      );
    }

    // Check for pending invitation with same email
    const existingInvitation = await this.prisma.teamInvitation.findFirst({
      where: {
        tenantId,
        inviteeEmail: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email',
      );
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.teamInvitation.create({
      data: {
        tenantId,
        invitedBy,
        inviteeEmail: dto.email,
        role: dto.role as TenantRole,
        token,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
    });

    this.logger.log(
      `Team invitation created for ${dto.email} in tenant ${tenantId} (token: ${token})`,
    );

    return invitation;
  }

  /**
   * Revoke (cancel) a pending invitation.
   */
  async revokeInvitation(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.teamInvitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  /**
   * Update a team member's role.
   * Cannot change own role. Cannot remove the last OWNER.
   */
  async updateMemberRole(
    tenantId: string,
    targetUserId: string,
    role: TenantRole,
    currentUserId: string,
  ) {
    if (targetUserId === currentUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: targetUserId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    // If changing from OWNER to something else, ensure there is at least one other OWNER
    if (membership.role === TenantRole.OWNER && role !== TenantRole.OWNER) {
      const ownerCount = await this.prisma.tenantMembership.count({
        where: { tenantId, role: TenantRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot change role: this is the last owner of the tenant',
        );
      }
    }

    const updated = await this.prisma.tenantMembership.update({
      where: {
        tenantId_userId: { tenantId, userId: targetUserId },
      },
      data: { role },
    });

    await this.redis
      .del(`tenant:role:${tenantId}:${targetUserId}`)
      .catch(() => {});

    return updated;
  }

  /**
   * Remove a team member from the tenant.
   * Cannot remove self. Cannot remove the last OWNER.
   */
  async removeMember(
    tenantId: string,
    targetUserId: string,
    currentUserId: string,
  ) {
    if (targetUserId === currentUserId) {
      throw new BadRequestException('Cannot remove yourself from the team');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: targetUserId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    // If removing an OWNER, ensure there is at least one other OWNER
    if (membership.role === TenantRole.OWNER) {
      const ownerCount = await this.prisma.tenantMembership.count({
        where: { tenantId, role: TenantRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of the tenant',
        );
      }
    }

    const deleted = await this.prisma.tenantMembership.delete({
      where: {
        tenantId_userId: { tenantId, userId: targetUserId },
      },
    });

    await this.redis
      .del(`tenant:role:${tenantId}:${targetUserId}`)
      .catch(() => {});

    return deleted;
  }

  /**
   * Replace all ServiceProvider records for a user+tenant with a new set of service IDs.
   */
  async assignServices(
    tenantId: string,
    userId: string,
    serviceIds: string[],
  ) {
    // Delete existing service provider records for this user+tenant
    await this.prisma.serviceProvider.deleteMany({
      where: { tenantId, userId },
    });

    // Create new records
    if (serviceIds.length > 0) {
      await this.prisma.serviceProvider.createMany({
        data: serviceIds.map((serviceId) => ({
          serviceId,
          userId,
          tenantId,
        })),
      });
    }

    // Return the newly assigned services
    return this.getAssignedServices(tenantId, userId);
  }

  /**
   * Get ServiceProvider records for a user in a tenant.
   */
  async getAssignedServices(tenantId: string, userId: string) {
    return this.prisma.serviceProvider.findMany({
      where: { tenantId, userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
          },
        },
      },
    });
  }

  /**
   * Accept a team invitation by token.
   * Validates the token is PENDING and not expired.
   * Creates TenantMembership and marks invitation as ACCEPTED.
   */
  async acceptInvitation(token: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation has already been used or revoked');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Find or create user by email
    let user = await this.prisma.user.findUnique({
      where: { email: invitation.inviteeEmail },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: invitation.inviteeEmail,
          name: invitation.inviteeEmail.split('@')[0] ?? 'Invited User',
        },
      });
      this.logger.log(
        `Created new user ${user.id} for invitation email ${invitation.inviteeEmail}`,
      );
    }

    // Create membership
    const membership = await this.prisma.tenantMembership.create({
      data: {
        tenantId: invitation.tenantId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await this.redis
      .del(`tenant:role:${invitation.tenantId}:${user.id}`)
      .catch(() => {});

    // Mark invitation as accepted
    await this.prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    this.logger.log(
      `Invitation ${invitation.id} accepted by user ${user.id} for tenant ${invitation.tenantId}`,
    );

    return membership;
  }
}
