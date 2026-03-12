import {
  Controller,
  Get,
  Post,
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
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { RecommendationsService } from './recommendations.service';
import { ChurnRiskService } from './churn-risk.service';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller()
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly churnRiskService: ChurnRiskService,
  ) {}

  @Get('tenants/:tenantId/recommendations/upsell')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get upsell recommendation insights for business' })
  @ApiResponse({ status: 200, description: 'Upsell recommendations' })
  async getUpsellRecommendations(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.recommendationsService.getUpsellRecommendations(tenantId);
  }

  @Get('tenants/:tenantId/clients/:clientId/churn-risk')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get churn risk for a specific client' })
  @ApiResponse({ status: 200, description: 'Client churn risk score' })
  async getClientChurnRisk(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('clientId', UuidValidationPipe) clientId: string,
  ) {
    return this.churnRiskService.getClientChurnRisk(clientId, tenantId);
  }

  @Get('tenants/:tenantId/churn-risk/at-risk')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List at-risk clients' })
  @ApiResponse({ status: 200, description: 'List of at-risk clients' })
  async getAtRiskClients(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('minLevel') minLevel?: string,
  ) {
    return this.churnRiskService.getAtRiskClients(tenantId, minLevel);
  }

  @Post('recommendations/:id/click')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Track recommendation click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.recommendationsService.trackClick(id);
  }
}
