import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingFlowTrackerService } from '@/analytics/services/booking-flow-tracker.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SESSION_ID = 'session-001';
const FLOW_ID = 'flow-001';
const ANALYTICS_ID = 'analytics-001';

function makePrisma() {
  return {
    bookingFlowAnalytics: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeExistingAnalytics(overrides: Record<string, unknown> = {}) {
  return {
    id: ANALYTICS_ID,
    tenantId: TENANT_ID,
    flowId: FLOW_ID,
    totalSessions: 10,
    completedSessions: 5,
    avgCompletionTimeSec: 120,
    conversionRate: 0.5,
    bounceRate: 0.3,
    totalRevenue: 500,
    stepMetrics: [
      { step: 'select-service', sessions: 10, dropOffs: 2, avgDurationMs: 3000 },
      { step: 'select-time', sessions: 8, dropOffs: 1, avgDurationMs: 5000 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingFlowTrackerService', () => {
  let service: BookingFlowTrackerService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BookingFlowTrackerService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // handleStepCompleted
  // -----------------------------------------------------------------------

  describe('handleStepCompleted', () => {
    it('creates a new analytics record when none exists for today', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);
      prisma.bookingFlowAnalytics.create.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        step: 'select-service',
        durationMs: 2000,
      });

      expect(prisma.bookingFlowAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          flowId: FLOW_ID,
          totalSessions: 1,
          completedSessions: 0,
          stepMetrics: [
            {
              step: 'select-service',
              sessions: 1,
              dropOffs: 0,
              avgDurationMs: 2000,
            },
          ],
        }),
      });
    });

    it('updates existing step metrics when record exists for today', async () => {
      const existing = makeExistingAnalytics({
        stepMetrics: [
          { step: 'select-service', sessions: 5, dropOffs: 1, avgDurationMs: 3000 },
        ],
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        step: 'select-service',
        durationMs: 6000,
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      const stepMetrics = updateCall.data.stepMetrics;
      const step = stepMetrics[0];
      // sessions incremented from 5 to 6
      expect(step.sessions).toBe(6);
      // avgDurationMs = round((3000 * 5 + 6000) / 6) = round(21000/6) = 3500
      expect(step.avgDurationMs).toBe(3500);
    });

    it('adds a new step entry when step does not exist in existing metrics', async () => {
      const existing = makeExistingAnalytics({
        stepMetrics: [
          { step: 'select-service', sessions: 5, dropOffs: 0, avgDurationMs: 3000 },
        ],
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        step: 'confirm',
        durationMs: 1500,
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      const stepMetrics = updateCall.data.stepMetrics;
      expect(stepMetrics).toHaveLength(2);
      expect(stepMetrics[1]).toEqual({
        step: 'confirm',
        sessions: 1,
        dropOffs: 0,
        avgDurationMs: 1500,
      });
    });

    it('increments totalSessions on update', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(
        makeExistingAnalytics(),
      );
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        step: 'select-service',
        durationMs: 2000,
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      expect(updateCall.data.totalSessions).toEqual({ increment: 1 });
    });

    it('does not throw when prisma throws (logs error instead)', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.handleStepCompleted({
          tenantId: TENANT_ID,
          sessionId: SESSION_ID,
          flowId: FLOW_ID,
          step: 'select-service',
          durationMs: 2000,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // handleSessionCompleted
  // -----------------------------------------------------------------------

  describe('handleSessionCompleted', () => {
    it('creates a new analytics record when none exists for today', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);
      prisma.bookingFlowAnalytics.create.mockResolvedValue({});

      await service.handleSessionCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        totalDurationMs: 60000,
        revenue: 50,
      });

      expect(prisma.bookingFlowAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          flowId: FLOW_ID,
          totalSessions: 1,
          completedSessions: 1,
          conversionRate: 1,
          avgCompletionTimeSec: 60,
          totalRevenue: 50,
          stepMetrics: [],
        }),
      });
    });

    it('updates existing record with weighted average completion time', async () => {
      const existing = makeExistingAnalytics({
        totalSessions: 10,
        completedSessions: 4,
        avgCompletionTimeSec: 100,
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        totalDurationMs: 150000, // 150 seconds
        revenue: 75,
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      // newCompleted = 4 + 1 = 5
      expect(updateCall.data.completedSessions).toBe(5);
      // newAvg = round((100*4 + 150) / 5) = round(550/5) = 110
      expect(updateCall.data.avgCompletionTimeSec).toBe(110);
      // conversionRate = 5 / 10 = 0.5
      expect(updateCall.data.conversionRate).toBe(0.5);
      expect(updateCall.data.totalRevenue).toEqual({ increment: 75 });
    });

    it('calculates conversion rate as zero when totalSessions is zero', async () => {
      const existing = makeExistingAnalytics({
        totalSessions: 0,
        completedSessions: 0,
        avgCompletionTimeSec: 0,
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionCompleted({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        totalDurationMs: 30000,
        revenue: 25,
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      expect(updateCall.data.conversionRate).toBe(0);
    });

    it('does not throw when prisma throws (logs error instead)', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockRejectedValue(
        new Error('Timeout'),
      );

      await expect(
        service.handleSessionCompleted({
          tenantId: TENANT_ID,
          sessionId: SESSION_ID,
          flowId: FLOW_ID,
          totalDurationMs: 5000,
          revenue: 10,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // handleSessionAbandoned
  // -----------------------------------------------------------------------

  describe('handleSessionAbandoned', () => {
    it('increments dropOffs for the last step on existing record', async () => {
      const existing = makeExistingAnalytics();
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        lastStep: 'select-service',
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      const stepMetrics = updateCall.data.stepMetrics;
      const step = stepMetrics.find(
        (s: { step: string }) => s.step === 'select-service',
      );
      // Original dropOffs was 2, now 3
      expect(step.dropOffs).toBe(3);
    });

    it('calculates bounce rate from sessions and completed sessions', async () => {
      const existing = makeExistingAnalytics({
        totalSessions: 20,
        completedSessions: 12,
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        lastStep: 'select-service',
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      // bounceRate = (20 - 12) / 20 = 0.4
      expect(updateCall.data.bounceRate).toBeCloseTo(0.4);
    });

    it('does nothing when no existing analytics record', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        lastStep: 'select-service',
      });

      expect(prisma.bookingFlowAnalytics.update).not.toHaveBeenCalled();
    });

    it('does not increment dropOffs for unknown step', async () => {
      const existing = makeExistingAnalytics();
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        lastStep: 'unknown-step',
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      const stepMetrics = updateCall.data.stepMetrics;
      // Original dropOffs should remain unchanged
      expect(stepMetrics[0].dropOffs).toBe(2);
      expect(stepMetrics[1].dropOffs).toBe(1);
    });

    it('sets bounce rate to zero when totalSessions is zero', async () => {
      const existing = makeExistingAnalytics({
        totalSessions: 0,
        completedSessions: 0,
      });
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(existing);
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        flowId: FLOW_ID,
        lastStep: 'select-service',
      });

      const updateCall = prisma.bookingFlowAnalytics.update.mock.calls[0]![0];
      expect(updateCall.data.bounceRate).toBe(0);
    });

    it('does not throw when prisma throws (logs error instead)', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockRejectedValue(
        new Error('Connection refused'),
      );

      await expect(
        service.handleSessionAbandoned({
          tenantId: TENANT_ID,
          sessionId: SESSION_ID,
          flowId: FLOW_ID,
          lastStep: 'select-service',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
