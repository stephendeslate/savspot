import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReviewsService } from '@/reviews/reviews.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CLIENT_ID = 'client-001';
const REVIEW_ID = 'review-001';
const BOOKING_ID = 'booking-001';

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    status: 'COMPLETED',
    ...overrides,
  };
}

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: REVIEW_ID,
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    clientId: CLIENT_ID,
    rating: 5,
    title: 'Great!',
    body: 'Loved it',
    isPublished: true,
    response: null,
    respondedAt: null,
    respondedBy: null,
    photos: [],
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReviewsService(prisma as never);
  });

  // ---------- create ----------

  describe('create', () => {
    it('creates a review for a completed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(makeBooking());
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(makeReview());

      const dto = { bookingId: BOOKING_ID, rating: 5, title: 'Great!' };
      const result = await service.create(TENANT_ID, CLIENT_ID, dto as never);

      expect(result.rating).toBe(5);
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, CLIENT_ID, { bookingId: 'nope', rating: 5 } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when client does not own booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(makeBooking({ clientId: 'other-client' }));

      await expect(
        service.create(TENANT_ID, CLIENT_ID, { bookingId: BOOKING_ID, rating: 5 } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when booking not completed', async () => {
      prisma.booking.findFirst.mockResolvedValue(makeBooking({ status: 'CONFIRMED' }));

      await expect(
        service.create(TENANT_ID, CLIENT_ID, { bookingId: BOOKING_ID, rating: 5 } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when review already exists', async () => {
      prisma.booking.findFirst.mockResolvedValue(makeBooking());
      prisma.review.findUnique.mockResolvedValue(makeReview());

      await expect(
        service.create(TENANT_ID, CLIENT_ID, { bookingId: BOOKING_ID, rating: 5 } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------- findAll ----------

  describe('findAll', () => {
    it('returns paginated reviews', async () => {
      prisma.review.findMany.mockResolvedValue([makeReview()]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 } as never);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('filters by rating when provided', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { rating: 5 } as never);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rating: 5 }),
        }),
      );
    });

    it('filters by serviceId when provided', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { serviceId: 'svc-1' } as never);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            booking: { serviceId: 'svc-1' },
          }),
        }),
      );
    });
  });

  // ---------- findOne ----------

  describe('findOne', () => {
    it('returns a single review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());

      const result = await service.findOne(TENANT_ID, REVIEW_ID);

      expect(result.id).toBe(REVIEW_ID);
    });

    it('throws NotFoundException when review not found', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('updates the review when user is the author', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.update.mockResolvedValue(makeReview({ rating: 4 }));

      const result = await service.update(TENANT_ID, REVIEW_ID, CLIENT_ID, {
        rating: 4,
      } as never);

      expect(result.rating).toBe(4);
    });

    it('throws ForbiddenException when user is not the author', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());

      await expect(
        service.update(TENANT_ID, REVIEW_ID, 'other-user', { rating: 3 } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when review not found', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nope', CLIENT_ID, { rating: 3 } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('allows the review author to delete', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.delete.mockResolvedValue(makeReview());

      const result = await service.remove(TENANT_ID, REVIEW_ID, CLIENT_ID, false);

      expect(result).toEqual({ deleted: true });
    });

    it('allows admin to delete another users review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.delete.mockResolvedValue(makeReview());

      const result = await service.remove(TENANT_ID, REVIEW_ID, 'admin-user', true);

      expect(result).toEqual({ deleted: true });
    });

    it('throws ForbiddenException when non-admin non-author tries to delete', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());

      await expect(
        service.remove(TENANT_ID, REVIEW_ID, 'other-user', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when review not found', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nope', CLIENT_ID, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- reply ----------

  describe('reply', () => {
    it('adds a business owner reply to a review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.update.mockResolvedValue(
        makeReview({ response: 'Thank you!', respondedBy: 'owner-1' }),
      );

      const result = await service.reply(TENANT_ID, REVIEW_ID, 'owner-1', {
        response: 'Thank you!',
      } as never);

      expect(result.response).toBe('Thank you!');
    });

    it('throws NotFoundException when review not found', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.reply(TENANT_ID, 'nope', 'owner-1', { response: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- adminFindAll ----------

  describe('adminFindAll', () => {
    it('returns paginated reviews with admin filters', async () => {
      prisma.review.findMany.mockResolvedValue([makeReview()]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.adminFindAll(TENANT_ID, {} as never);

      expect(result.data).toHaveLength(1);
    });

    it('filters by isPublished', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.adminFindAll(TENANT_ID, { isPublished: true } as never);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublished: true }),
        }),
      );
    });

    it('filters for reviews with response when hasResponse is true', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.adminFindAll(TENANT_ID, { hasResponse: true } as never);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ response: { not: null } }),
        }),
      );
    });

    it('filters for reviews without response when hasResponse is false', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.adminFindAll(TENANT_ID, { hasResponse: false } as never);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ response: null }),
        }),
      );
    });
  });

  // ---------- togglePublish ----------

  describe('togglePublish', () => {
    it('publishes a review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview({ isPublished: false }));
      prisma.review.update.mockResolvedValue(makeReview({ isPublished: true }));

      const result = await service.togglePublish(TENANT_ID, REVIEW_ID, {
        isPublished: true,
      } as never);

      expect(result.isPublished).toBe(true);
    });

    it('unpublishes a review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview({ isPublished: true }));
      prisma.review.update.mockResolvedValue(makeReview({ isPublished: false }));

      const result = await service.togglePublish(TENANT_ID, REVIEW_ID, {
        isPublished: false,
      } as never);

      expect(result.isPublished).toBe(false);
    });

    it('throws NotFoundException when review not found', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.togglePublish(TENANT_ID, 'nope', { isPublished: true } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
