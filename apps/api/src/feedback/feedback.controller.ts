import {
  Controller,
  Get,
  Post,
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
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Submit feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted' })
  async submit(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(tenantId, userId, dto);
  }

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all feedback for tenant (admin view)' })
  @ApiResponse({ status: 200, description: 'List of feedback entries' })
  async list(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
  ) {
    return this.feedbackService.listFeedback(tenantId);
  }

  @Get(':id')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get a single feedback entry' })
  @ApiResponse({ status: 200, description: 'Feedback details' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async findOne(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.feedbackService.getFeedback(tenantId, id);
  }
}
