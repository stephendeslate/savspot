import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ExecutionService } from '@/workflows/services/execution.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TEMPLATE_ID = 'template-001';
const EXECUTION_ID = 'exec-001';
const STAGE_ID = 'stage-001';
const BOOKING_ID = 'booking-001';

function makePrisma() {
  return {
    automationExecution: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function makeExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: EXECUTION_ID,
    tenantId: TENANT_ID,
    templateId: TEMPLATE_ID,
    bookingId: BOOKING_ID,
    triggerEvent: 'BOOKING_CREATED',
    triggerEventData: {},
    status: 'IN_PROGRESS',
    stageResults: null,
    currentStageId: null,
    error: null,
    startedAt: new Date('2026-03-01T00:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ExecutionService', () => {
  let service: ExecutionService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ExecutionService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listByTemplate
  // -----------------------------------------------------------------------

  describe('listByTemplate', () => {
    it('should return paginated executions with defaults', async () => {
      const executions = [makeExecution()];
      prisma.automationExecution.findMany.mockResolvedValue(executions);
      prisma.automationExecution.count.mockResolvedValue(1);

      const result = await service.listByTemplate(TEMPLATE_ID, {});

      expect(result.data).toEqual(executions);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.automationExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { templateId: TEMPLATE_ID },
          skip: 0,
          take: 20,
          orderBy: { startedAt: 'desc' },
        }),
      );
    });

    it('should respect custom page and limit', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);
      prisma.automationExecution.count.mockResolvedValue(50);

      const result = await service.listByTemplate(TEMPLATE_ID, {
        page: 3,
        limit: 10,
      });

      expect(result.meta).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });
      expect(prisma.automationExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should filter by status when provided', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);
      prisma.automationExecution.count.mockResolvedValue(0);

      await service.listByTemplate(TEMPLATE_ID, { status: 'FAILED' });

      expect(prisma.automationExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { templateId: TEMPLATE_ID, status: 'FAILED' },
        }),
      );
      expect(prisma.automationExecution.count).toHaveBeenCalledWith({
        where: { templateId: TEMPLATE_ID, status: 'FAILED' },
      });
    });

    it('should calculate totalPages correctly with partial last page', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);
      prisma.automationExecution.count.mockResolvedValue(25);

      const result = await service.listByTemplate(TEMPLATE_ID, { limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return 0 totalPages when no results', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);
      prisma.automationExecution.count.mockResolvedValue(0);

      const result = await service.listByTemplate(TEMPLATE_ID, {});

      expect(result.meta.totalPages).toBe(0);
    });

    it('should include template, booking, and currentStage relations', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);
      prisma.automationExecution.count.mockResolvedValue(0);

      await service.listByTemplate(TEMPLATE_ID, {});

      expect(prisma.automationExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            template: { select: { id: true, name: true } },
            booking: { select: { id: true, status: true } },
            currentStage: { select: { id: true, name: true } },
          },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------

  describe('findOne', () => {
    it('should return execution with full includes', async () => {
      const execution = makeExecution();
      prisma.automationExecution.findUnique.mockResolvedValue(execution);

      const result = await service.findOne(EXECUTION_ID);

      expect(result).toEqual(execution);
      expect(prisma.automationExecution.findUnique).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        include: {
          template: {
            include: {
              stages: { orderBy: { order: 'asc' } },
            },
          },
          booking: { select: { id: true, status: true } },
          currentStage: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException when execution does not exist', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // retry
  // -----------------------------------------------------------------------

  describe('retry', () => {
    it('should mark a failed execution as PENDING for retry', async () => {
      const failed = makeExecution({ status: 'FAILED', error: 'Stage timeout' });
      prisma.automationExecution.findUnique.mockResolvedValue(failed);
      const updated = makeExecution({ status: 'PENDING', error: null });
      prisma.automationExecution.update.mockResolvedValue(updated);

      const result = await service.retry(EXECUTION_ID);

      expect(result.status).toBe('PENDING');
      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: {
          status: 'PENDING',
          error: null,
          completedAt: null,
        },
      });
    });

    it('should throw BadRequestException when execution is not FAILED', async () => {
      const inProgress = makeExecution({ status: 'IN_PROGRESS' });
      prisma.automationExecution.findUnique.mockResolvedValue(inProgress);

      await expect(service.retry(EXECUTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for SUCCEEDED executions', async () => {
      const succeeded = makeExecution({ status: 'SUCCEEDED' });
      prisma.automationExecution.findUnique.mockResolvedValue(succeeded);

      await expect(service.retry(EXECUTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when execution does not exist', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(null);

      await expect(service.retry('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // bulkRetryFailed
  // -----------------------------------------------------------------------

  describe('bulkRetryFailed', () => {
    it('should retry all failed executions for a tenant', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([
        { id: 'exec-1' },
        { id: 'exec-2' },
      ]);
      prisma.automationExecution.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkRetryFailed(TENANT_ID);

      expect(result).toEqual({ retried: 2 });
      expect(prisma.automationExecution.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, status: 'FAILED' },
        data: {
          status: 'PENDING',
          error: null,
          completedAt: null,
        },
      });
    });

    it('should return retried: 0 when no failed executions exist', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);

      const result = await service.bulkRetryFailed(TENANT_ID);

      expect(result).toEqual({ retried: 0 });
      expect(prisma.automationExecution.updateMany).not.toHaveBeenCalled();
    });

    it('should scope queries to the provided tenantId', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([{ id: 'e1' }]);
      prisma.automationExecution.updateMany.mockResolvedValue({ count: 1 });

      await service.bulkRetryFailed('other-tenant');

      expect(prisma.automationExecution.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'other-tenant', status: 'FAILED' },
        select: { id: true },
      });
      expect(prisma.automationExecution.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'other-tenant', status: 'FAILED' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // createExecution
  // -----------------------------------------------------------------------

  describe('createExecution', () => {
    it('should create an execution with correct data', async () => {
      const created = makeExecution();
      prisma.automationExecution.create.mockResolvedValue(created);

      const result = await service.createExecution(
        TENANT_ID,
        TEMPLATE_ID,
        BOOKING_ID,
        'BOOKING_CREATED',
        { bookingId: BOOKING_ID },
      );

      expect(result).toEqual(created);
      expect(prisma.automationExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          templateId: TEMPLATE_ID,
          bookingId: BOOKING_ID,
          triggerEvent: 'BOOKING_CREATED',
          triggerEventData: { bookingId: BOOKING_ID },
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should accept null bookingId', async () => {
      const created = makeExecution({ bookingId: null });
      prisma.automationExecution.create.mockResolvedValue(created);

      const result = await service.createExecution(
        TENANT_ID,
        TEMPLATE_ID,
        null,
        'MANUAL_TRIGGER',
        {},
      );

      expect(result.bookingId).toBeNull();
      expect(prisma.automationExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: null,
        }),
      });
    });

    it('should set startedAt to a Date', async () => {
      prisma.automationExecution.create.mockResolvedValue(makeExecution());

      await service.createExecution(
        TENANT_ID,
        TEMPLATE_ID,
        BOOKING_ID,
        'BOOKING_CREATED',
        {},
      );

      const callData = prisma.automationExecution.create.mock.calls[0]![0].data;
      expect(callData.startedAt).toBeInstanceOf(Date);
    });
  });

  // -----------------------------------------------------------------------
  // updateStageResult
  // -----------------------------------------------------------------------

  describe('updateStageResult', () => {
    const stageResult = {
      status: 'SUCCEEDED',
      executedAt: new Date('2026-03-01T01:00:00Z'),
      duration_ms: 150,
    };

    it('should append a stage result to null stageResults', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(
        makeExecution({ stageResults: null }),
      );
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, stageResult);

      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: {
          currentStageId: STAGE_ID,
          stageResults: [
            {
              stageId: STAGE_ID,
              status: 'SUCCEEDED',
              executedAt: '2026-03-01T01:00:00.000Z',
              duration_ms: 150,
              error: undefined,
            },
          ],
        },
      });
    });

    it('should append to existing stageResults array', async () => {
      const existingEntry = {
        stageId: 'stage-000',
        status: 'SUCCEEDED',
        executedAt: '2026-03-01T00:30:00.000Z',
        duration_ms: 100,
      };
      prisma.automationExecution.findUnique.mockResolvedValue(
        makeExecution({ stageResults: [existingEntry] }),
      );
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, stageResult);

      const callData = prisma.automationExecution.update.mock.calls[0]![0].data;
      expect(callData.stageResults).toHaveLength(2);
      expect(callData.stageResults[0]).toEqual(existingEntry);
      expect(callData.stageResults[1].stageId).toBe(STAGE_ID);
    });

    it('should include error in stage result when provided', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(
        makeExecution({ stageResults: null }),
      );
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, {
        ...stageResult,
        status: 'FAILED',
        error: 'Webhook timeout',
      });

      const callData = prisma.automationExecution.update.mock.calls[0]![0].data;
      expect(callData.stageResults[0].error).toBe('Webhook timeout');
      expect(callData.stageResults[0].status).toBe('FAILED');
    });

    it('should update currentStageId', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(
        makeExecution({ stageResults: null }),
      );
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, stageResult);

      expect(prisma.automationExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStageId: STAGE_ID }),
        }),
      );
    });

    it('should throw NotFoundException when execution does not exist', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStageResult('nonexistent', STAGE_ID, stageResult),
      ).rejects.toThrow(NotFoundException);
    });

    it('should serialize executedAt as ISO string', async () => {
      const date = new Date('2026-06-15T12:30:45.123Z');
      prisma.automationExecution.findUnique.mockResolvedValue(
        makeExecution({ stageResults: null }),
      );
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, {
        ...stageResult,
        executedAt: date,
      });

      const callData = prisma.automationExecution.update.mock.calls[0]![0].data;
      expect(callData.stageResults[0].executedAt).toBe(
        '2026-06-15T12:30:45.123Z',
      );
    });
  });

  // -----------------------------------------------------------------------
  // completeExecution
  // -----------------------------------------------------------------------

  describe('completeExecution', () => {
    it('should mark execution as SUCCEEDED', async () => {
      const completed = makeExecution({
        status: 'SUCCEEDED',
        completedAt: new Date(),
      });
      prisma.automationExecution.update.mockResolvedValue(completed);

      const result = await service.completeExecution(EXECUTION_ID, 'SUCCEEDED');

      expect(result.status).toBe('SUCCEEDED');
      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: expect.objectContaining({
          status: 'SUCCEEDED',
          error: null,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should mark execution as FAILED with error message', async () => {
      const completed = makeExecution({
        status: 'FAILED',
        error: 'Stage 3 failed',
      });
      prisma.automationExecution.update.mockResolvedValue(completed);

      const result = await service.completeExecution(
        EXECUTION_ID,
        'FAILED',
        'Stage 3 failed',
      );

      expect(result.status).toBe('FAILED');
      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Stage 3 failed',
        }),
      });
    });

    it('should set error to null when no error is provided', async () => {
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.completeExecution(EXECUTION_ID, 'SUCCEEDED');

      expect(prisma.automationExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ error: null }),
        }),
      );
    });

    it('should set completedAt to a Date', async () => {
      prisma.automationExecution.update.mockResolvedValue(makeExecution());

      await service.completeExecution(EXECUTION_ID, 'SUCCEEDED');

      const callData = prisma.automationExecution.update.mock.calls[0]![0].data;
      expect(callData.completedAt).toBeInstanceOf(Date);
    });
  });
});
