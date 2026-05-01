import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobSchedulerService } from '@/jobs/job-scheduler.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    // staleRepeatables cleanup path uses getRepeatableJobs +
    // removeRepeatableByKey; default to empty so cleanup is a no-op.
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    removeRepeatableByKey: vi.fn().mockResolvedValue(undefined),
  };
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
    it('should register all repeating jobs across BullMQ-active queues', async () => {
      await service.onModuleInit();

      // Queues still on BullMQ should have add() called for their schedules.
      // Queues fully migrated to Inngest (directory, partners) have no
      // schedules registered here — they're only listed in staleRepeatables
      // so any leftover Redis repeatables are removed at startup.
      const inngestMigrated = new Set(['directory', 'partners', 'customDomains']);
      for (const [name, queue] of Object.entries(queues)) {
        if (inngestMigrated.has(name)) {
          expect(queue.add).not.toHaveBeenCalled();
        } else {
          expect(queue.add).toHaveBeenCalled();
        }
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

    it('should not register partner payout on the BullMQ partners queue (migrated to Inngest)', async () => {
      await service.onModuleInit();

      // Phase 4f migrated partner payout to Inngest. The BullMQ partners
      // queue must not receive any add() calls so it cannot dual-fire with
      // the Inngest cron on the 1st of each month.
      expect(queues['partners']!.add).not.toHaveBeenCalled();
    });

    it('should remove stale BullMQ repeatables for queues migrated to Inngest', async () => {
      const directoryListing = {
        key: 'directoryListingRefresh::::0 5 * * *',
        name: 'directoryListingRefresh',
      };
      const partnerPayout = {
        key: 'partnerPayoutBatch::::0 0 1 * *',
        name: 'partnerPayoutBatch',
      };
      queues['directory']!.getRepeatableJobs.mockResolvedValueOnce([directoryListing]);
      queues['partners']!.getRepeatableJobs.mockResolvedValueOnce([partnerPayout]);

      await service.onModuleInit();

      expect(queues['directory']!.removeRepeatableByKey).toHaveBeenCalledWith(directoryListing.key);
      expect(queues['partners']!.removeRepeatableByKey).toHaveBeenCalledWith(partnerPayout.key);
    });
  });
});
