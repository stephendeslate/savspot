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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { FeatureEntitlementGuard } from '../common/guards/feature-entitlement.guard';
import { RequiresTier } from '../common/decorators/requires-feature.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CustomDomainsService } from './custom-domains.service';
import { AddDomainDto } from './dto/add-domain.dto';
import { RequiresLicense } from '@savspot/ee';

@ApiTags('Custom Domains')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard, FeatureEntitlementGuard)
@RequiresTier('TEAM')
@TenantRoles('OWNER', 'ADMIN')

@RequiresLicense()
@Controller('tenants/:tenantId/custom-domain')
export class CustomDomainsController {
  constructor(private readonly service: CustomDomainsService) {}

  @Post()
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Add a custom domain for the tenant' })
  @ApiResponse({ status: 201, description: 'Custom domain added with DNS instructions' })
  @ApiResponse({ status: 400, description: 'Feature not enabled or invalid domain' })
  @ApiResponse({ status: 409, description: 'Domain already in use or tenant already has a domain' })
  async addDomain(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: AddDomainDto,
  ) {
    return this.service.addDomain(tenantId, dto.domain);
  }

  @Get()
  @ApiOperation({ summary: 'Get custom domain status for the tenant' })
  @ApiResponse({ status: 200, description: 'Domain status returned (or null if none configured)' })
  async getDomainStatus(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.service.getDomainStatus(tenantId);
  }

  @Delete()
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Remove the custom domain from the tenant' })
  @ApiResponse({ status: 200, description: 'Domain removed' })
  @ApiResponse({ status: 404, description: 'No custom domain configured' })
  async removeDomain(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.service.removeDomain(tenantId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Force DNS verification check for the custom domain' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  @ApiResponse({ status: 404, description: 'No custom domain configured' })
  async forceVerify(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.service.forceVerify(tenantId);
  }
}
