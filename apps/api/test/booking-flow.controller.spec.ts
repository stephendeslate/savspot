import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingFlowController } from '@/booking-flow/booking-flow.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

const makeService = () => ({
  getBookingFlow: vi.fn(),
  updateBookingFlow: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingFlowController', () => {
  let controller: BookingFlowController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new BookingFlowController(service as never);
  });

  // -----------------------------------------------------------------------
  // getBookingFlow
  // -----------------------------------------------------------------------

  describe('getBookingFlow', () => {
    it('should call service.getBookingFlow with tenantId and return the result', async () => {
      const flow = { steps: ['SELECT_SERVICE', 'SELECT_DATE', 'CONFIRM'] };
      service.getBookingFlow.mockResolvedValue(flow);

      const result = await controller.getBookingFlow(TENANT_ID);

      expect(service.getBookingFlow).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(flow);
    });

    it('should forward service errors', async () => {
      service.getBookingFlow.mockRejectedValue(new Error('Service error'));

      await expect(controller.getBookingFlow(TENANT_ID)).rejects.toThrow('Service error');
    });
  });

  // -----------------------------------------------------------------------
  // updateBookingFlow
  // -----------------------------------------------------------------------

  describe('updateBookingFlow', () => {
    it('should call service.updateBookingFlow with tenantId and dto', async () => {
      const dto = { requirePayment: true, allowWaitlist: false };
      const updated = { ...dto, tenantId: TENANT_ID };
      service.updateBookingFlow.mockResolvedValue(updated);

      const result = await controller.updateBookingFlow(TENANT_ID, dto as never);

      expect(service.updateBookingFlow).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(updated);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('should pass different tenant IDs independently', async () => {
      service.getBookingFlow.mockResolvedValue({});

      await controller.getBookingFlow('tenant-A');
      await controller.getBookingFlow('tenant-B');

      expect(service.getBookingFlow).toHaveBeenCalledWith('tenant-A');
      expect(service.getBookingFlow).toHaveBeenCalledWith('tenant-B');
      expect(service.getBookingFlow).toHaveBeenCalledTimes(2);
    });
  });
});
