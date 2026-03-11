import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { TemplateService } from './services/template.service';
import { StageService } from './services/stage.service';
import { ExecutionService } from './services/execution.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateBookingOverrideDto } from './dto/booking-override.dto';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller()
export class WorkflowsController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly stageService: StageService,
    private readonly executionService: ExecutionService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Template CRUD ----

  @Get('tenants/:tenantId/workflow-templates')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List workflow templates for a tenant' })
  @ApiResponse({ status: 200, description: 'List of workflow templates' })
  async listTemplates(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templateService.list(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('tenants/:tenantId/workflow-templates')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a workflow template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templateService.create(tenantId, dto);
  }

  @Get('workflow-templates/:id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get workflow template detail' })
  @ApiResponse({ status: 200, description: 'Template detail' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templateService.findOne(id);
  }

  @Patch('workflow-templates/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a workflow template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, dto);
  }

  @Delete('workflow-templates/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a workflow template' })
  @ApiResponse({ status: 204, description: 'Template deactivated' })
  async deleteTemplate(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.templateService.softDelete(id);
  }

  @Post('workflow-templates/:id/duplicate')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Duplicate a workflow template with all stages' })
  @ApiResponse({ status: 201, description: 'Template duplicated' })
  async duplicateTemplate(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templateService.duplicate(id);
  }

  // ---- Stage CRUD ----

  @Get('workflow-templates/:templateId/stages')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List stages for a workflow template' })
  @ApiResponse({ status: 200, description: 'List of stages' })
  async listStages(
    @Param('templateId', UuidValidationPipe) templateId: string,
  ) {
    return this.stageService.list(templateId);
  }

  @Post('workflow-templates/:templateId/stages')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a stage to a workflow template' })
  @ApiResponse({ status: 201, description: 'Stage created' })
  async createStage(
    @Param('templateId', UuidValidationPipe) templateId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stageService.create(templateId, dto);
  }

  @Patch('workflow-stages/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a workflow stage' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async updateStage(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stageService.update(id, dto);
  }

  @Delete('workflow-stages/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workflow stage' })
  @ApiResponse({ status: 204, description: 'Stage removed' })
  async deleteStage(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.stageService.remove(id);
  }

  @Post('workflow-templates/:templateId/stages/reorder')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reorder stages within a workflow template' })
  @ApiResponse({ status: 200, description: 'Stages reordered' })
  async reorderStages(
    @Param('templateId', UuidValidationPipe) templateId: string,
    @Body() body: { stageIds: string[] },
  ) {
    return this.stageService.reorder(templateId, body.stageIds);
  }

  // ---- Execution ----

  @Get('workflow-templates/:id/executions')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List executions for a workflow template' })
  @ApiResponse({ status: 200, description: 'Paginated list of executions' })
  async listExecutions(
    @Param('id', UuidValidationPipe) id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.executionService.listByTemplate(id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('automation-executions/:id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get automation execution detail' })
  @ApiResponse({ status: 200, description: 'Execution detail with stage results' })
  async getExecution(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.executionService.findOne(id);
  }

  @Post('automation-executions/:id/retry')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Retry a failed automation execution' })
  @ApiResponse({ status: 200, description: 'Execution marked for retry' })
  async retryExecution(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.executionService.retry(id);
  }

  @Post('tenants/:tenantId/automation-executions/retry-failed')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Retry all failed automation executions for a tenant' })
  @ApiResponse({ status: 200, description: 'Count of executions marked for retry' })
  async bulkRetryFailed(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.executionService.bulkRetryFailed(tenantId);
  }

  // ---- Per-Booking Overrides ----

  @Get('bookings/:bookingId/workflow-overrides')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List workflow overrides for a booking' })
  @ApiResponse({ status: 200, description: 'List of overrides' })
  async listOverrides(
    @Param('bookingId', UuidValidationPipe) bookingId: string,
  ) {
    return this.prisma.bookingWorkflowOverride.findMany({
      where: { bookingId },
      include: {
        stage: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('bookings/:bookingId/workflow-overrides')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a workflow override for a booking' })
  @ApiResponse({ status: 201, description: 'Override created' })
  async createOverride(
    @Param('bookingId', UuidValidationPipe) bookingId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBookingOverrideDto,
  ) {
    return this.prisma.bookingWorkflowOverride.create({
      data: {
        bookingId,
        stageId: dto.stageId ?? null,
        overrideType: dto.overrideType as 'SKIP' | 'DISABLE_AUTOMATION' | 'CUSTOM_TIMING' | 'ADD_STAGE',
        overrideConfig: dto.overrideConfig
          ? (dto.overrideConfig as Prisma.InputJsonValue)
          : Prisma.DbNull,
        reason: dto.reason,
        createdBy: userId,
      },
      include: {
        stage: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  @Delete('booking-workflow-overrides/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a booking workflow override' })
  @ApiResponse({ status: 204, description: 'Override removed' })
  async deleteOverride(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.prisma.bookingWorkflowOverride.delete({
      where: { id },
    });
  }
}
