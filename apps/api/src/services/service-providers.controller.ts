import {
  Controller,
  Get,
  Post,
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
import { Throttle } from '@nestjs/throttler';
import { ServiceProvidersService } from './service-providers.service';
import { AssignProviderDto } from './dto/assign-provider.dto';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Service Providers')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller('tenants/:tenantId/services/:serviceId/providers')
export class ServiceProvidersController {
  constructor(
    private readonly serviceProvidersService: ServiceProvidersService,
  ) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List providers assigned to a service' })
  @ApiResponse({ status: 200, description: 'List of assigned providers' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
  ) {
    return this.serviceProvidersService.listProviders(tenantId, serviceId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Assign a provider to a service' })
  @ApiResponse({ status: 201, description: 'Provider assigned' })
  @ApiResponse({ status: 404, description: 'Service or user not found' })
  @ApiResponse({ status: 409, description: 'Provider already assigned' })
  async assign(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
    @Body() dto: AssignProviderDto,
  ) {
    return this.serviceProvidersService.assignProvider(
      tenantId,
      serviceId,
      dto.userId,
    );
  }

  @Delete(':userId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Unassign a provider from a service' })
  @ApiResponse({ status: 200, description: 'Provider unassigned' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async unassign(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
    @Param('userId', UuidValidationPipe) userId: string,
  ) {
    return this.serviceProvidersService.unassignProvider(
      tenantId,
      serviceId,
      userId,
    );
  }
}
