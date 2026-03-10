import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { clampPageSize } from '../common/utils/pagination';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a review for a completed booking.
   * Validates that the booking exists, belongs to the tenant and client,
   * is completed, and hasn't already been reviewed.
   */
  async create(tenantId: string, clientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Reviews can only be submitted for completed bookings',
      );
    }

    // Check if a review already exists for this booking
    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      throw new ConflictException('A review already exists for this booking');
    }

    const review = await this.prisma.review.create({
      data: {
        tenantId,
        bookingId: dto.bookingId,
        clientId,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body ?? null,
        photos: dto.photos
          ? {
              create: dto.photos.map((photo, index) => ({
                url: photo.url,
                thumbnailUrl: photo.thumbnailUrl ?? null,
                sortOrder: photo.sortOrder ?? index,
              })),
            }
          : undefined,
      },
      include: { photos: true },
    });

    this.logger.log(
      `Review ${review.id} created for booking ${dto.bookingId} by client ${clientId}`,
    );

    return review;
  }

  /**
   * List reviews for a tenant with pagination and optional filters.
   */
  async findAll(tenantId: string, filters: ListReviewsDto) {
    const { serviceId, rating, sortOrder = 'desc', page = 1, limit: rawLimit = 20 } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = { tenantId };

    if (rating) {
      where.rating = rating;
    }

    if (serviceId) {
      where.booking = { serviceId };
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          photos: { orderBy: { sortOrder: 'asc' } },
          client: { select: { id: true, name: true, avatarUrl: true } },
          booking: { select: { id: true, serviceId: true, startTime: true } },
        },
        orderBy: { createdAt: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single review by ID.
   */
  async findOne(tenantId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        client: { select: { id: true, name: true, avatarUrl: true } },
        booking: { select: { id: true, serviceId: true, startTime: true } },
        respondedByUser: { select: { id: true, name: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  /**
   * Update a review. Only the review author can update their own review.
   */
  async update(
    tenantId: string,
    reviewId: string,
    userId: string,
    dto: UpdateReviewDto,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.clientId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isPublished: dto.isPublished,
      },
      include: { photos: true },
    });

    this.logger.log(`Review ${reviewId} updated by client ${userId}`);

    return updated;
  }

  /**
   * Delete a review. The author or an admin/owner can delete.
   */
  async remove(
    tenantId: string,
    reviewId: string,
    userId: string,
    isAdminOrOwner: boolean,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.clientId !== userId && !isAdminOrOwner) {
      throw new ForbiddenException(
        'You can only delete your own reviews unless you are an admin',
      );
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    this.logger.log(
      `Review ${reviewId} deleted by ${isAdminOrOwner ? 'admin' : 'client'} ${userId}`,
    );

    return { deleted: true };
  }

  /**
   * Add a business owner reply to a review.
   */
  async reply(
    tenantId: string,
    reviewId: string,
    userId: string,
    dto: ReplyReviewDto,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response: dto.response,
        respondedAt: new Date(),
        respondedBy: userId,
      },
      include: {
        photos: true,
        respondedByUser: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `Review ${reviewId} replied to by ${userId}`,
    );

    return updated;
  }
}
