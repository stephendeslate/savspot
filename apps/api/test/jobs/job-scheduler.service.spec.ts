import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobSchedulerService } from '@/jobs/job-scheduler.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueue() {
  return { add: vi.fn().mockResolvedValue(undefined) };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('JobSchedulerService', () => {
  let service: JobSchedulerService;
  let queues: Record<string, ReturnType<typeof makeQueue>>;

  beforeEach(() => {
    queues = {
      bookings: makeQueue(),
      payments: makeQueue(),
      comms: makeQueue(),
      calendar: makeQueue(),
      gdpr: makeQueue(),
      platformMetrics: makeQueue(),
      aiOperations: makeQueue(),
      directory: makeQueue(),
      customDomains: makeQueue(),
      partners: makeQueue(),
    };

    service = new JobSchedulerService(
      queues['bookings'] as never,
      queues['payments'] as never,
      queues['comms'] as never,
      queues['calendar'] as never,
      queues['gdpr'] as never,
      queues['platformMetrics'] as never,
      queues['aiOperations'] as never,
      queues['directory'] as never,
      queues['customDomains'] as never,
      queues['partners'] as never,
    );
  });

  describe('onModuleInit', () => {
    it('should register all repeating jobs across all queues', async () => {
      await service.onModuleInit();

      // All queues should have had add() called
      for (const queue of Object.values(queues)) {
        expect(queue.add).toHaveBeenCalled();
      }
    });

    it('should call add() with repeat pattern for each schedule', async () => {
      await service.onModuleInit();

      // Check one specific schedule: bookings queue should have expire-reservations
      const bookingsCalls = queues['bookings']!.add.mock.calls;
      const expireCall = bookingsCalls.find(
        (call: unknown[]) => call[0] === 'expireReservations',
      );
      expect(expireCall).toBeDefined();
      expect(expireCall![2]).toEqual(
        expect.objectContaining({
          repeat: expect.objectContaining({ pattern: expect.any(String) }),
        }),
      );
    });

    it('should include removeOnComplete and removeOnFail options', async () => {
      await service.onModuleInit();

      const firstCall = queues['bookings']!.add.mock.calls[0];
      expect(firstCall![2]).toEqual(
        expect.objectContaining({
          removeOnComplete: { count: 10 },
          removeOnFail: { count: 50 },
        }),
      );
    });

    it('should handle queue.add failure gracefully without throwing', async () => {
      queues['bookings']!.add.mockRejectedValueOnce(new Error('Redis down'));

      // Should not throw even if one job registration fails
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('should continue registering other jobs when one fails', async () => {
      queues['bookings']!.add.mockRejectedValueOnce(new Error('Redis down'));

      await service.onModuleInit();

      // Payments queue should still have been called
      expect(queues['payments']!.add).toHaveBeenCalled();
    });

    it('should register partner payout job on partners queue', async () => {
      await service.onModuleInit();

      const partnerCalls = queues['partners']!.add.mock.calls;
      expect(partnerCalls.length).toBeGreaterThanOrEqual(1);
      expect(partnerCalls[0]![0]).toBe('partnerPayoutBatch');
    });
  });
});
