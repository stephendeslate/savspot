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
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { WebhookService } from './services/webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller()
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get('tenants/:tenantId/webhooks')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List webhook endpoints for a tenant' })
  @ApiResponse({ status: 200, description: 'List of webhook endpoints' })
  async list(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.webhookService.list(tenantId);
  }

  @Post('tenants/:tenantId/webhooks')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a webhook endpoint (returns signing secret once)' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created with signing secret' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.create(tenantId, dto);
  }

  @Patch('webhooks/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint updated' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(id, dto);
  }

  @Delete('webhooks/:id')
  @TenantRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook endpoint and pending deliveries' })
  @ApiResponse({ status: 204, description: 'Webhook endpoint deleted' })
  async delete(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.webhookService.delete(id);
  }

  @Post('webhooks/:id/test')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send a test webhook payload' })
  @ApiResponse({ status: 200, description: 'Test webhook queued' })
  async sendTest(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.webhookService.sendTest(id);
  }

  @Post('webhooks/:id/rotate-secret')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Rotate the webhook signing secret' })
  @ApiResponse({ status: 200, description: 'New secret generated' })
  async rotateSecret(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.webhookService.rotateSecret(id);
  }

  @Get('webhooks/:id/deliveries')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List delivery log for a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Paginated delivery log' })
  async listDeliveries(
    @Param('id', UuidValidationPipe) id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhookService.listDeliveries(id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
