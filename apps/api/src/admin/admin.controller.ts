import {
  Controller,
  Get,
  Patch,
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { AdminService } from './admin.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { ListFeedbackDto, BulkUpdateFeedbackStatusDto } from './dto/list-feedback.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('PLATFORM_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async listTenants(@Query() query: ListTenantsDto) {
    return this.adminService.listTenants(query);
  }

  @Patch('tenants/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant status updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenantStatus(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.adminService.updateTenantStatus(id, dto.status);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform-wide metrics' })
  @ApiResponse({ status: 200, description: 'Platform metrics' })
  async getMetrics() {
    return this.adminService.getPlatformMetrics();
  }

  @Get('subscriptions/overview')
  @ApiOperation({ summary: 'Get subscription tier distribution and MRR' })
  @ApiResponse({ status: 200, description: 'Subscription overview' })
  async getSubscriptionOverview() {
    return this.adminService.getSubscriptionOverview();
  }

  @Get('feedback')
  @ApiOperation({ summary: 'List feedback items with filters' })
  @ApiResponse({ status: 200, description: 'Paginated feedback list' })
  async listFeedback(@Query() query: ListFeedbackDto) {
    return this.adminService.listFeedback(query);
  }

  @Patch('feedback/bulk-status')
  @ApiOperation({ summary: 'Bulk update feedback status' })
  @ApiResponse({ status: 200, description: 'Feedback statuses updated' })
  async bulkUpdateFeedbackStatus(@Body() dto: BulkUpdateFeedbackStatusDto) {
    return this.adminService.bulkUpdateFeedbackStatus(dto);
  }

  @Get('migration-readiness')
  @ApiOperation({ summary: 'Get migration readiness summary across all active tenants' })
  @ApiResponse({ status: 200, description: 'Migration readiness summary' })
  async getMigrationReadinessSummary() {
    return this.adminService.getMigrationReadinessSummary();
  }

  @Get('migration-readiness/:tenantId')
  @ApiOperation({ summary: 'Get migration readiness for a specific tenant' })
  @ApiResponse({ status: 200, description: 'Tenant migration readiness' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getMigrationReadiness(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.adminService.getMigrationReadiness(tenantId);
  }

  @Get('support/tickets')
  @ApiOperation({ summary: 'List support tickets with filters' })
  @ApiResponse({ status: 200, description: 'Paginated ticket list' })
  async listSupportTickets(@Query() query: ListSupportTicketsDto) {
    return this.adminService.listSupportTickets(query);
  }

  @Get('support/metrics')
  @ApiOperation({ summary: 'Get support metrics — AI resolution rate, escalations' })
  @ApiResponse({ status: 200, description: 'Support metrics' })
  async getSupportMetrics() {
    return this.adminService.getSupportMetrics();
  }
}
