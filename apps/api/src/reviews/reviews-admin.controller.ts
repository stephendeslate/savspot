import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { ReviewsService } from './reviews.service';
import { AdminListReviewsDto } from './dto/admin-list-reviews.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { PublishReviewDto } from './dto/publish-review.dto';

@ApiTags('Reviews (Admin)')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(TenantRolesGuard)
export class ReviewsAdminController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all reviews with admin filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: AdminListReviewsDto,
  ) {
    return this.reviewsService.adminFindAll(tenantId, query);
  }

  @Post(':id/reply')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiResponse({ status: 201, description: 'Reply added' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async reply(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(tenantId, id, userId, dto);
  }

  @Patch(':id/publish')
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Toggle publish/unpublish status of a review' })
  @ApiResponse({ status: 200, description: 'Review publish status updated' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async togglePublish(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: PublishReviewDto,
  ) {
    return this.reviewsService.togglePublish(tenantId, id, dto);
  }
}
