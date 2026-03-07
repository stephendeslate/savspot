import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ApplyPresetDto } from './dto/apply-preset.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantsService.create(userId, dto);
  }

  @Get(':id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id', UuidValidationPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/apply-preset')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER')
  @ApiOperation({ summary: 'Apply business category preset to tenant' })
  @ApiResponse({
    status: 201,
    description: 'Preset applied — services, availability, and workflows created',
  })
  @ApiResponse({ status: 409, description: 'Preset already applied' })
  async applyPreset(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: ApplyPresetDto,
  ) {
    return this.tenantsService.applyPreset(id, dto.category);
  }

  @Post(':id/export')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Request business data export',
    description: 'Creates a data export request for the tenant. Processing runs asynchronously.',
  })
  @ApiResponse({ status: 201, description: 'Export request created' })
  async requestExport(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tenantsService.requestExport(id, userId);
  }
}
