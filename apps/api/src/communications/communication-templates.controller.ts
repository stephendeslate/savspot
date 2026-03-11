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
} from '@nestjs/swagger';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CommunicationTemplatesService } from './communication-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ListTemplatesDto } from './dto/list-templates.dto';

@ApiTags('Communication Templates')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/communication-templates')
export class CommunicationTemplatesController {
  constructor(
    private readonly templatesService: CommunicationTemplatesService,
  ) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List communication templates' })
  @ApiResponse({ status: 200, description: 'Paginated list of templates' })
  async listTemplates(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListTemplatesDto,
  ) {
    return this.templatesService.listTemplates(tenantId, {
      channel: query.channel,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('variables')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get available template variables' })
  @ApiResponse({ status: 200, description: 'List of available template variables' })
  async getAvailableVariables() {
    return this.templatesService.getAvailableVariables();
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get a communication template' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templatesService.getTemplate(tenantId, id);
  }

  @Post()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a communication template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(tenantId, dto);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a communication template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.templatesService.updateTemplate(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a communication template (soft delete)' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templatesService.deleteTemplate(tenantId, id);
  }

  @Get(':id/history')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get template version history' })
  @ApiResponse({ status: 200, description: 'Template history' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateHistory(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templatesService.getTemplateHistory(tenantId, id);
  }

  @Post(':id/rollback/:historyId')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Rollback template to a previous version' })
  @ApiResponse({ status: 200, description: 'Template rolled back' })
  @ApiResponse({ status: 404, description: 'Template or history entry not found' })
  async rollbackTemplate(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Param('historyId', UuidValidationPipe) historyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.templatesService.rollbackTemplate(tenantId, id, historyId, userId);
  }
}
