import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { Public } from '../common/decorators/public.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Waitlist')
@Controller()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  // -----------------------------------------------------------------------
  // Public: Join waitlist from a booking session
  // -----------------------------------------------------------------------

  @Post('booking-sessions/:id/waitlist')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Join waitlist from a booking session' })
  @ApiResponse({ status: 201, description: 'Waitlist entry created' })
  async joinWaitlist(
    @Param('id', UuidValidationPipe) sessionId: string,
    @Body() dto: CreateWaitlistEntryDto,
  ) {
    const entry = await this.waitlistService.createFromSession(
      sessionId,
      dto.preferredDate,
      dto.preferredTimeStart,
      dto.preferredTimeEnd,
    );
    return { data: entry };
  }

  // -----------------------------------------------------------------------
  // Admin: List waitlist entries for a tenant
  // -----------------------------------------------------------------------

  @Get('tenants/:tenantId/waitlist')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List waitlist entries for a tenant' })
  async listWaitlist(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    const entries = await this.waitlistService.listByTenant(tenantId);
    return { data: entries };
  }

  // -----------------------------------------------------------------------
  // Admin: Remove a waitlist entry
  // -----------------------------------------------------------------------

  @Delete('tenants/:tenantId/waitlist/:id')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove a waitlist entry' })
  async removeWaitlistEntry(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    const result = await this.waitlistService.remove(tenantId, id);
    return { data: result };
  }
}
