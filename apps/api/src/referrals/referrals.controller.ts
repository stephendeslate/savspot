import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ReferralsService } from './referrals.service';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { UpdateReferralLinkDto } from './dto/update-referral-link.dto';

export class ListReferralLinksQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}

@ApiTags('Referral Links')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('tenants/:tenantId/referral-links')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List referral links for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of referral links' })
  async listLinks(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListReferralLinksQuery,
  ) {
    return this.referralsService.listLinks(tenantId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Post('tenants/:tenantId/referral-links')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a referral link' })
  @ApiResponse({ status: 201, description: 'Referral link created' })
  @ApiResponse({ status: 400, description: 'Invalid input or rate limit exceeded' })
  async createLink(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateReferralLinkDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.referralsService.createLink(tenantId, dto, userId);
  }

  @Patch('referral-links/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a referral link' })
  @ApiResponse({ status: 200, description: 'Referral link updated' })
  @ApiResponse({ status: 404, description: 'Referral link not found' })
  async updateLink(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateReferralLinkDto,
  ) {
    return this.referralsService.updateLink(id, dto);
  }

  @Delete('referral-links/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a referral link (soft delete)' })
  @ApiResponse({ status: 200, description: 'Referral link deactivated' })
  @ApiResponse({ status: 404, description: 'Referral link not found' })
  async deleteLink(@Param('id', UuidValidationPipe) id: string) {
    return this.referralsService.deleteLink(id);
  }

  @Get('referral-links/:id/analytics')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get analytics for a referral link' })
  @ApiResponse({ status: 200, description: 'Referral link analytics' })
  @ApiResponse({ status: 404, description: 'Referral link not found' })
  async getLinkAnalytics(@Param('id', UuidValidationPipe) id: string) {
    return this.referralsService.getLinkAnalytics(id);
  }
}
