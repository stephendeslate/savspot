import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto } from './dto/create-gallery-photo.dto';
import { UpdateGalleryPhotoDto } from './dto/update-gallery-photo.dto';

@ApiTags('Gallery')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List gallery photos for tenant' })
  @ApiResponse({ status: 200, description: 'List of gallery photos' })
  @ApiQuery({ name: 'venueId', required: false })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('venueId') venueId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('category') category?: string,
  ) {
    return this.galleryService.findAll(tenantId, { venueId, serviceId, category });
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a gallery photo' })
  @ApiResponse({ status: 201, description: 'Photo added' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateGalleryPhotoDto,
  ) {
    return this.galleryService.create(tenantId, dto);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a gallery photo' })
  @ApiResponse({ status: 200, description: 'Photo updated' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateGalleryPhotoDto,
  ) {
    return this.galleryService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gallery photo' })
  @ApiResponse({ status: 204, description: 'Photo deleted' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.galleryService.remove(tenantId, id);
  }
}
