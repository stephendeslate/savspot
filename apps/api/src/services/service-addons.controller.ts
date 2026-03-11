import {
  Controller,
  Get,
  Post,
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
import { Throttle } from '@nestjs/throttler';
import { ServiceAddonsService } from './service-addons.service';
import { CreateServiceAddonDto } from './dto/create-service-addon.dto';
import { UpdateServiceAddonDto } from './dto/update-service-addon.dto';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Service Add-ons')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller('tenants/:tenantId/services/:serviceId/addons')
export class ServiceAddonsController {
  constructor(private readonly serviceAddonsService: ServiceAddonsService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List add-ons for a service' })
  @ApiResponse({ status: 200, description: 'List of active add-ons' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
  ) {
    return this.serviceAddonsService.listAddons(tenantId, serviceId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a service add-on' })
  @ApiResponse({ status: 201, description: 'Add-on created' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
    @Body() dto: CreateServiceAddonDto,
  ) {
    return this.serviceAddonsService.createAddon(tenantId, serviceId, dto);
  }

  @Patch(':addonId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a service add-on' })
  @ApiResponse({ status: 200, description: 'Add-on updated' })
  @ApiResponse({ status: 404, description: 'Add-on not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
    @Param('addonId', UuidValidationPipe) addonId: string,
    @Body() dto: UpdateServiceAddonDto,
  ) {
    return this.serviceAddonsService.updateAddon(
      tenantId,
      serviceId,
      addonId,
      dto,
    );
  }

  @Delete(':addonId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a service add-on (soft delete)' })
  @ApiResponse({ status: 200, description: 'Add-on deactivated' })
  @ApiResponse({ status: 404, description: 'Add-on not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('serviceId', UuidValidationPipe) serviceId: string,
    @Param('addonId', UuidValidationPipe) addonId: string,
  ) {
    return this.serviceAddonsService.deleteAddon(tenantId, serviceId, addonId);
  }
}
