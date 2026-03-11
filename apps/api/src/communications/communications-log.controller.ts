import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { CommunicationsLogService } from './communications-log.service';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/communications')
export class CommunicationsLogController {
  constructor(private readonly logService: CommunicationsLogService) {}

  @Get('log')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get delivery tracking log for sent communications' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channel', required: false, enum: ['EMAIL', 'SMS'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated delivery log' })
  async getLog(
    @Param('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.logService.getLog(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      channel: channel as 'EMAIL' | 'SMS' | undefined,
      status,
      clientId,
    });
  }
}
