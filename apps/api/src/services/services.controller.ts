import {
  Controller,
  Get,
  Post,
  Put,
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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SetPreferenceTemplateDto } from './dto/preference-template.dto';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller('tenants/:tenantId/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List all services for a tenant' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async findAll(@Param('tenantId', UuidValidationPipe) tenantId: string) {
    return this.servicesService.findAll(tenantId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(tenantId, dto);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findById(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.servicesService.findById(tenantId, id);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a service (soft delete)' })
  @ApiResponse({ status: 200, description: 'Service deactivated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.servicesService.remove(tenantId, id);
  }

  @Post(':id/copy')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Copy/duplicate a service' })
  @ApiResponse({ status: 201, description: 'Service copied' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async copy(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.servicesService.copy(tenantId, id);
  }

  @Get(':id/preference-template')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get preference template for a service' })
  @ApiResponse({ status: 200, description: 'Preference template' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getPreferenceTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.servicesService.getPreferenceTemplate(tenantId, id);
  }

  @Put(':id/preference-template')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Set or update preference template for a service' })
  @ApiResponse({ status: 200, description: 'Preference template updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async setPreferenceTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: SetPreferenceTemplateDto,
  ) {
    return this.servicesService.setPreferenceTemplate(tenantId, id, dto.template);
  }
}
