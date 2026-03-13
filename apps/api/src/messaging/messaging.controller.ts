import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MessagingService } from './messaging.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('threads')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List message threads' })
  @ApiResponse({ status: 200, description: 'Paginated list of threads' })
  async listThreads(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.listThreads(
      tenantId,
      userId,
      page ? parseInt(page, 10) : undefined,
      limit ? Math.min(parseInt(limit, 10) || 20, 100) : undefined,
    );
  }

  @Post('threads')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a message thread' })
  @ApiResponse({ status: 201, description: 'Thread created' })
  async createThread(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateThreadDto,
  ) {
    return this.messagingService.createThread(tenantId, userId, dto);
  }

  @Get('threads/:id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get a message thread with messages' })
  @ApiResponse({ status: 200, description: 'Thread with messages' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async getThread(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.messagingService.getThread(tenantId, id);
  }

  @Post('threads/:id/messages')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async sendMessage(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(tenantId, id, userId, dto);
  }

  @Patch('threads/:id/read')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Mark all messages in a thread as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async markThreadRead(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagingService.markThreadRead(tenantId, id, userId);
  }
}
