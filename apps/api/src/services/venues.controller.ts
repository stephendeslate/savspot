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
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Venues')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List all venues for a tenant' })
  @ApiResponse({ status: 200, description: 'List of venues' })
  async findAll(@Param('tenantId', UuidValidationPipe) tenantId: string) {
    return this.venuesService.findAll(tenantId);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a venue' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venuesService.create(tenantId, dto);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get a venue by ID' })
  @ApiResponse({ status: 200, description: 'Venue details' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  async findById(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.venuesService.findById(tenantId, id);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a venue' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a venue (soft delete)' })
  @ApiResponse({ status: 200, description: 'Venue deactivated' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.venuesService.remove(tenantId, id);
  }
}
