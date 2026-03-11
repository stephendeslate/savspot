import {
  Controller,
  Get,
  Post,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { AiOperationsService } from './ai-operations.service';

@ApiTags('AI Operations')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/ai')
export class AiOperationsController {
  constructor(private readonly aiOperationsService: AiOperationsService) {}

  @Get('insights/demand')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get active slot demand insight cards' })
  @ApiResponse({ status: 200, description: 'List of demand insights' })
  async getDemandInsights(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.aiOperationsService.getSlotDemandInsights(tenantId);
  }

  @Post('insights/:id/dismiss')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Dismiss a demand insight card' })
  @ApiResponse({ status: 200, description: 'Insight dismissed' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async dismissInsight(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiOperationsService.dismissInsight(tenantId, id, userId);
  }

  @Get('insights/benchmarks')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get category benchmark comparisons' })
  @ApiResponse({ status: 200, description: 'Benchmark data' })
  async getBenchmarks(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.aiOperationsService.getBenchmarks(tenantId);
  }

  @Get('clients/:clientId/risk')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get client no-show risk for next booking' })
  @ApiResponse({ status: 200, description: 'Client risk data' })
  async getClientRisk(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('clientId', UuidValidationPipe) clientId: string,
  ) {
    return this.aiOperationsService.getClientRisk(tenantId, clientId);
  }

  @Get('clients/:clientId/rebooking')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get client rebooking interval' })
  @ApiResponse({ status: 200, description: 'Client rebooking data' })
  async getClientRebooking(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('clientId', UuidValidationPipe) clientId: string,
  ) {
    return this.aiOperationsService.getClientRebooking(tenantId, clientId);
  }
}
