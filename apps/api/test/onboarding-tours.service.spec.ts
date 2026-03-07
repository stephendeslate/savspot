import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingToursService } from '@/onboarding-tours/onboarding-tours.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

function makePrisma() {
  return {
    onboardingTour: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

function makeTour(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tour-001',
    userId: USER_ID,
    tourKey: 'dashboard-intro',
    completedAt: null,
    dismissedAt: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('OnboardingToursService', () => {
  let service: OnboardingToursService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OnboardingToursService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAllForUser
  // -----------------------------------------------------------------------

  describe('findAllForUser', () => {
    it('should return all tours for the user', async () => {
      const tours = [
        makeTour(),
        makeTour({ id: 'tour-002', tourKey: 'calendar-intro' }),
      ];
      prisma.onboardingTour.findMany.mockResolvedValue(tours);

      const result = await service.findAllForUser(USER_ID);

      expect(result).toEqual(tours);
      expect(prisma.onboardingTour.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no tours', async () => {
      prisma.onboardingTour.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateTour
  // -----------------------------------------------------------------------

  describe('updateTour', () => {
    it('should set completedAt when action is complete', async () => {
      const tour = makeTour({ completedAt: new Date() });
      prisma.onboardingTour.upsert.mockResolvedValue(tour);

      const result = await service.updateTour(USER_ID, 'dashboard-intro', 'complete');

      expect(result).toEqual(tour);
      const call = prisma.onboardingTour.upsert.mock.calls[0]![0];
      expect(call.where.userId_tourKey).toEqual({
        userId: USER_ID,
        tourKey: 'dashboard-intro',
      });
      expect(call.create.completedAt).toBeInstanceOf(Date);
      expect(call.create.dismissedAt).toBeUndefined();
      expect(call.update.completedAt).toBeInstanceOf(Date);
    });

    it('should set dismissedAt when action is dismiss', async () => {
      const tour = makeTour({ dismissedAt: new Date() });
      prisma.onboardingTour.upsert.mockResolvedValue(tour);

      await service.updateTour(USER_ID, 'calendar-intro', 'dismiss');

      const call = prisma.onboardingTour.upsert.mock.calls[0]![0];
      expect(call.create.dismissedAt).toBeInstanceOf(Date);
      expect(call.create.completedAt).toBeUndefined();
      expect(call.update.dismissedAt).toBeInstanceOf(Date);
    });

    it('should upsert so new tours are created', async () => {
      prisma.onboardingTour.upsert.mockResolvedValue(makeTour());

      await service.updateTour(USER_ID, 'new-tour', 'complete');

      const call = prisma.onboardingTour.upsert.mock.calls[0]![0];
      expect(call.create.userId).toBe(USER_ID);
      expect(call.create.tourKey).toBe('new-tour');
    });
  });
});
