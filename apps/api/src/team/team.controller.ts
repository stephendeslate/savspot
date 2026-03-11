import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TeamService } from './team.service';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@ApiTags('Team')
@ApiBearerAuth()
@Controller()
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // -------------------------------------------------------------------------
  // Tenant-scoped team endpoints
  // -------------------------------------------------------------------------

  @Get('tenants/:tenantId/team')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List all team members for a tenant' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  async listMembers(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.teamService.listMembers(tenantId);
  }

  @Get('tenants/:tenantId/team/invitations')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List pending team invitations' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listInvitations(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.teamService.listInvitations(tenantId);
  }

  @Post('tenants/:tenantId/team/invite')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Invite a new team member' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  @ApiResponse({ status: 409, description: 'Duplicate email or pending invitation' })
  async inviteMember(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') currentUserId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamService.inviteMember(tenantId, currentUserId, dto);
  }

  @Delete('tenants/:tenantId/team/invitations/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Revoke a pending team invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) invitationId: string,
  ) {
    return this.teamService.revokeInvitation(tenantId, invitationId);
  }

  @Patch('tenants/:tenantId/team/:userId/role')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a team member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 400, description: 'Cannot change own role or remove last owner' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async updateMemberRole(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) targetUserId: string,
    @CurrentUser('sub') currentUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(
      tenantId,
      targetUserId,
      dto.role,
      currentUserId,
    );
  }

  @Delete('tenants/:tenantId/team/:userId')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove a team member' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 400, description: 'Cannot remove self or last owner' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async removeMember(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) targetUserId: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    return this.teamService.removeMember(tenantId, targetUserId, currentUserId);
  }

  @Post('tenants/:tenantId/team/:userId/services')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Assign services to a team member' })
  @ApiResponse({ status: 201, description: 'Services assigned' })
  async assignServices(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) userId: string,
    @Body() dto: AssignServicesDto,
  ) {
    return this.teamService.assignServices(tenantId, userId, dto.serviceIds);
  }

  @Get('tenants/:tenantId/team/:userId/services')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get services assigned to a team member' })
  @ApiResponse({ status: 200, description: 'List of assigned services' })
  async getAssignedServices(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) userId: string,
  ) {
    return this.teamService.getAssignedServices(tenantId, userId);
  }

  // -------------------------------------------------------------------------
  // Permissions endpoints
  // -------------------------------------------------------------------------

  @Get('tenants/:tenantId/team/:userId/permissions')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get effective permissions for a team member' })
  @ApiResponse({ status: 200, description: 'Effective permissions returned' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async getPermissions(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) userId: string,
  ) {
    return this.permissionsService.getEffectivePermissionsForMember(
      tenantId,
      userId,
    );
  }

  @Put('tenants/:tenantId/team/:userId/permissions')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update permission overrides for a team member' })
  @ApiResponse({ status: 200, description: 'Permissions updated' })
  @ApiResponse({ status: 400, description: 'Cannot expand permissions beyond role defaults' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  async updatePermissions(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('userId', UuidValidationPipe) userId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.permissionsService.updatePermissions(tenantId, userId, dto);
  }

  // -------------------------------------------------------------------------
  // Public endpoint: accept invitation (no auth required)
  // -------------------------------------------------------------------------

  @Post('auth/accept-invitation')
  @Public()
  @ApiOperation({ summary: 'Accept a team invitation by token' })
  @ApiResponse({ status: 201, description: 'Invitation accepted, membership created' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already used' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async acceptInvitation(@Body('token') token: string) {
    return this.teamService.acceptInvitation(token);
  }
}
