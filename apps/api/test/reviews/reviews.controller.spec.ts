import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewsController } from '@/reviews/reviews.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReviewsService() {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reply: vi.fn(),
  };
}

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let reviewsService: ReturnType<typeof makeReviewsService>;

  beforeEach(() => {
    reviewsService = makeReviewsService();
    controller = new ReviewsController(reviewsService as never);
  });

  it('create delegates to service', async () => {
    reviewsService.create.mockResolvedValue({ id: 'r-1' });

    const result = await controller.create('t-1', 'u-1', { bookingId: 'b-1', rating: 5 } as never);

    expect(reviewsService.create).toHaveBeenCalledWith('t-1', 'u-1', { bookingId: 'b-1', rating: 5 });
    expect(result.id).toBe('r-1');
  });

  it('findAll delegates to service', async () => {
    reviewsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('t-1', {} as never);

    expect(reviewsService.findAll).toHaveBeenCalledWith('t-1', {});
  });

  it('findOne delegates to service', async () => {
    reviewsService.findOne.mockResolvedValue({ id: 'r-1' });

    const result = await controller.findOne('t-1', 'r-1');

    expect(reviewsService.findOne).toHaveBeenCalledWith('t-1', 'r-1');
    expect(result.id).toBe('r-1');
  });

  it('update delegates to service', async () => {
    reviewsService.update.mockResolvedValue({ id: 'r-1', rating: 4 });

    const result = await controller.update('t-1', 'r-1', 'u-1', { rating: 4 } as never);

    expect(reviewsService.update).toHaveBeenCalledWith('t-1', 'r-1', 'u-1', { rating: 4 });
    expect(result.rating).toBe(4);
  });

  it('remove delegates to service with admin detection', async () => {
    reviewsService.remove.mockResolvedValue({ deleted: true });

    const result = await controller.remove('t-1', 'r-1', 'u-1', 'OWNER');

    expect(reviewsService.remove).toHaveBeenCalledWith('t-1', 'r-1', 'u-1', true);
    expect(result.deleted).toBe(true);
  });

  it('remove passes isAdminOrOwner=false for STAFF role', async () => {
    reviewsService.remove.mockResolvedValue({ deleted: true });

    await controller.remove('t-1', 'r-1', 'u-1', 'STAFF');

    expect(reviewsService.remove).toHaveBeenCalledWith('t-1', 'r-1', 'u-1', false);
  });

  it('reply delegates to service', async () => {
    reviewsService.reply.mockResolvedValue({ response: 'Thanks!' });

    const result = await controller.reply('t-1', 'r-1', 'u-1', { response: 'Thanks!' } as never);

    expect(reviewsService.reply).toHaveBeenCalledWith('t-1', 'r-1', 'u-1', { response: 'Thanks!' });
    expect(result.response).toBe('Thanks!');
  });
});
