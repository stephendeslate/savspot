import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiOperationsController } from '@/ai-operations/ai-operations.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const INSIGHT_ID = 'insight-001';
const CLIENT_ID = 'client-001';
const USER_ID = 'user-001';

const makeService = () => ({
  getSlotDemandInsights: vi.fn(),
  dismissInsight: vi.fn(),
  getBenchmarks: vi.fn(),
  getClientRisk: vi.fn(),
  getClientRebooking: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AiOperationsController', () => {
  let controller: AiOperationsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new AiOperationsController(service as never);
  });

  describe('getDemandInsights', () => {
    it('should call service.getSlotDemandInsights with tenantId', async () => {
      const insights = [{ id: INSIGHT_ID }];
      service.getSlotDemandInsights.mockResolvedValue(insights);

      const result = await controller.getDemandInsights(TENANT_ID);

      expect(service.getSlotDemandInsights).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(insights);
    });
  });

  describe('dismissInsight', () => {
    it('should call service.dismissInsight with tenantId, insightId, and userId', async () => {
      const dismissed = { id: INSIGHT_ID, isDismissed: true };
      service.dismissInsight.mockResolvedValue(dismissed);

      const result = await controller.dismissInsight(TENANT_ID, INSIGHT_ID, USER_ID);

      expect(service.dismissInsight).toHaveBeenCalledWith(TENANT_ID, INSIGHT_ID, USER_ID);
      expect(result).toEqual(dismissed);
    });
  });

  describe('getBenchmarks', () => {
    it('should call service.getBenchmarks with tenantId', async () => {
      const benchmarks = { optedOut: false, benchmarks: [] };
      service.getBenchmarks.mockResolvedValue(benchmarks);

      const result = await controller.getBenchmarks(TENANT_ID);

      expect(service.getBenchmarks).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(benchmarks);
    });
  });

  describe('getClientRisk', () => {
    it('should call service.getClientRisk with tenantId and clientId', async () => {
      const risk = { riskScore: 0.75, riskTier: 'HIGH' };
      service.getClientRisk.mockResolvedValue(risk);

      const result = await controller.getClientRisk(TENANT_ID, CLIENT_ID);

      expect(service.getClientRisk).toHaveBeenCalledWith(TENANT_ID, CLIENT_ID);
      expect(result).toEqual(risk);
    });
  });

  describe('getClientRebooking', () => {
    it('should call service.getClientRebooking with tenantId and clientId', async () => {
      const rebooking = { rebookingIntervalDays: 30, optimalReminderLeadHours: 24 };
      service.getClientRebooking.mockResolvedValue(rebooking);

      const result = await controller.getClientRebooking(TENANT_ID, CLIENT_ID);

      expect(service.getClientRebooking).toHaveBeenCalledWith(TENANT_ID, CLIENT_ID);
      expect(result).toEqual(rebooking);
    });
  });

  describe('tenant isolation', () => {
    it('should pass different tenant IDs independently', async () => {
      service.getSlotDemandInsights.mockResolvedValue([]);

      await controller.getDemandInsights('tenant-A');
      await controller.getDemandInsights('tenant-B');

      expect(service.getSlotDemandInsights).toHaveBeenCalledWith('tenant-A');
      expect(service.getSlotDemandInsights).toHaveBeenCalledWith('tenant-B');
    });
  });
});
