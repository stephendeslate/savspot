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
    // Phase 4 cleanup A: every queue has been ported to Inngest. The
    // service no longer registers any new repeatable jobs — its only
    // remaining responsibility is to remove stale BullMQ repeatable
    // entries from Redis on the next worker boot.
    it('should not register any new repeatable jobs', async () => {
      await service.onModuleInit();

      for (const [, queue] of Object.entries(queues)) {
        expect(queue.add).not.toHaveBeenCalled();
      }
    });

    it('should sweep stale BullMQ repeatables across every previously-scheduled queue', async () => {
      const directoryListing = {
        key: 'directoryListingRefresh::::0 5 * * *',
        name: 'directoryListingRefresh',
      };
      const expireReservations = {
        key: 'expireReservations::::*/5 * * * *',
        name: 'expireReservations',
      };
      const sendPaymentReminders = {
        key: 'sendPaymentReminders::::*/15 * * * *',
        name: 'sendPaymentReminders',
      };
      queues['directory']!.getRepeatableJobs.mockResolvedValueOnce([directoryListing]);
      queues['bookings']!.getRepeatableJobs.mockResolvedValueOnce([expireReservations]);
      queues['payments']!.getRepeatableJobs.mockResolvedValueOnce([sendPaymentReminders]);

      await service.onModuleInit();

      expect(queues['directory']!.removeRepeatableByKey).toHaveBeenCalledWith(directoryListing.key);
      expect(queues['bookings']!.removeRepeatableByKey).toHaveBeenCalledWith(expireReservations.key);
      expect(queues['payments']!.removeRepeatableByKey).toHaveBeenCalledWith(sendPaymentReminders.key);
    });

    it('should handle removeRepeatableByKey failure gracefully without throwing', async () => {
      queues['bookings']!.getRepeatableJobs.mockRejectedValueOnce(new Error('Redis down'));

      // Should not throw even if one queue's cleanup fails
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
