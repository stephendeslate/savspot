import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ImportsService } from './imports.service';
import { CreateImportDto } from './dto/create-import.dto';
import { ListImportsDto } from './dto/list-imports.dto';

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('tenants/:tenantId/imports')
@UseGuards(TenantRolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new import job' })
  @ApiResponse({ status: 201, description: 'Import job created and queued' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateImportDto,
  ) {
    return this.importsService.create(tenantId, userId, dto, null);
  }

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List import jobs for tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of import jobs' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListImportsDto,
  ) {
    return this.importsService.findAll(tenantId, query);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get import job status and details' })
  @ApiResponse({ status: 200, description: 'Import job details' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  async findOne(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.importsService.findOne(tenantId, id);
  }

  @Get(':id/errors')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get import error report' })
  @ApiResponse({ status: 200, description: 'Error report for the import job' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  async getErrors(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.importsService.getErrorReport(tenantId, id);
  }
}
