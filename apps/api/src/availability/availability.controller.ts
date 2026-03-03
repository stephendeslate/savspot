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
import { AvailabilityService } from './availability.service';
import { AvailabilityRulesService } from './availability-rules.service';
import { BlockedDatesService } from './blocked-dates.service';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateBlockedDateDto } from './dto/create-blocked-date.dto';
import { Public } from '../common/decorators/public.decorator';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Availability')
@Controller('tenants/:tenantId')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly rulesService: AvailabilityRulesService,
    private readonly blockedDatesService: BlockedDatesService,
  ) {}

  // ─── Public availability query ────────────────────────────────────────────

  @Get('availability')
  @Public()
  @ApiOperation({ summary: 'Query available time slots for a service' })
  @ApiResponse({ status: 200, description: 'List of available time slots' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getAvailability(
    @Param('tenantId') tenantId: string,
    @Query() query: QueryAvailabilityDto,
  ) {
    return this.availabilityService.getAvailableSlots({
      tenantId,
      serviceId: query.serviceId,
      startDate: query.startDate,
      endDate: query.endDate,
      venueId: query.venueId,
    });
  }

  // ─── Availability Rules CRUD ──────────────────────────────────────────────

  @Get('availability-rules')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List availability rules for a tenant' })
  @ApiResponse({ status: 200, description: 'List of availability rules' })
  async findAllRules(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('serviceId') serviceId?: string,
    @Query('venueId') venueId?: string,
  ) {
    return this.rulesService.findAll(tenantId, serviceId, venueId);
  }

  @Post('availability-rules')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create an availability rule' })
  @ApiResponse({ status: 201, description: 'Availability rule created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createRule(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.rulesService.create(tenantId, dto);
  }

  @Patch('availability-rules/:id')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update an availability rule' })
  @ApiResponse({ status: 200, description: 'Availability rule updated' })
  @ApiResponse({ status: 404, description: 'Availability rule not found' })
  async updateRule(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.update(tenantId, id, dto);
  }

  @Delete('availability-rules/:id')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete an availability rule' })
  @ApiResponse({ status: 200, description: 'Availability rule deleted' })
  @ApiResponse({ status: 404, description: 'Availability rule not found' })
  async removeRule(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.rulesService.remove(tenantId, id);
  }

  // ─── Blocked Dates ────────────────────────────────────────────────────────

  @Post('blocked-dates')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Block a date' })
  @ApiResponse({ status: 201, description: 'Date blocked' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createBlockedDate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBlockedDateDto,
  ) {
    return this.blockedDatesService.create(tenantId, userId, dto);
  }

  @Delete('blocked-dates/:id')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove a blocked date' })
  @ApiResponse({ status: 200, description: 'Blocked date removed' })
  @ApiResponse({ status: 404, description: 'Blocked date not found' })
  async removeBlockedDate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.blockedDatesService.remove(tenantId, id);
  }
}
