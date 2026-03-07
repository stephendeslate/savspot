import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingToursController } from '@/onboarding-tours/onboarding-tours.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

const makeService = () => ({
  findAllForUser: vi.fn(),
  updateTour: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('OnboardingToursController', () => {
  let controller: OnboardingToursController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new OnboardingToursController(service as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should call service.findAllForUser with userId', async () => {
      const tours = [{ tourKey: 'dashboard', completed: false }];
      service.findAllForUser.mockResolvedValue(tours);

      const result = await controller.findAll(USER_ID);

      expect(service.findAllForUser).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(tours);
    });

    it('should return empty array when no tours exist', async () => {
      service.findAllForUser.mockResolvedValue([]);

      const result = await controller.findAll(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should call service.updateTour with userId, tourKey, and action', async () => {
      const dto = { action: 'COMPLETE' };
      const updated = { tourKey: 'dashboard', completed: true };
      service.updateTour.mockResolvedValue(updated);

      const result = await controller.update(USER_ID, 'dashboard', dto as never);

      expect(service.updateTour).toHaveBeenCalledWith(USER_ID, 'dashboard', 'COMPLETE');
      expect(result).toEqual(updated);
    });

    it('should pass DISMISS action to the service', async () => {
      const dto = { action: 'DISMISS' };
      service.updateTour.mockResolvedValue({ tourKey: 'settings', dismissed: true });

      await controller.update(USER_ID, 'settings', dto as never);

      expect(service.updateTour).toHaveBeenCalledWith(USER_ID, 'settings', 'DISMISS');
    });

    it('should forward different tourKey values', async () => {
      const dto = { action: 'COMPLETE' };
      service.updateTour.mockResolvedValue({});

      await controller.update(USER_ID, 'calendar-intro', dto as never);

      expect(service.updateTour).toHaveBeenCalledWith(USER_ID, 'calendar-intro', 'COMPLETE');
    });
  });
});
