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
import { Public } from '../common/decorators/public.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@ApiTags('Reviews')
@Controller('tenants/:tenantId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Booking not completed' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Review already exists for booking' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(tenantId, userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List reviews with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews' })
  async findAll(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.reviewsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single review' })
  @ApiResponse({ status: 200, description: 'Review details' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.reviewsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiResponse({ status: 403, description: 'Not the review author' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(tenantId, id, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete own review or admin delete' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantRole') tenantRole: string,
  ) {
    const isAdminOrOwner = tenantRole === 'OWNER' || tenantRole === 'ADMIN';
    return this.reviewsService.remove(tenantId, id, userId, isAdminOrOwner);
  }

  @Post(':id/reply')
  @ApiBearerAuth()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a business owner reply to a review' })
  @ApiResponse({ status: 201, description: 'Reply added' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async reply(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(tenantId, id, userId, dto);
  }
}
