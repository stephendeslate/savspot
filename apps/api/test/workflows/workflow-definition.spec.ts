import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TemplateService } from '@/workflows/services/template.service';
import { ExecutionService } from '@/workflows/services/execution.service';
import { StageService } from '@/workflows/services/stage.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TEMPLATE_ID = 'template-001';
const STAGE_ID = 'stage-001';
const EXECUTION_ID = 'execution-001';
const BOOKING_ID = 'booking-001';

function makePrismaForTemplate() {
  return {
    workflowTemplate: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makePrismaForExecution() {
  return {
    automationExecution: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makePrismaForStage() {
  return {
    workflowStage: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    workflowTemplate: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: 'Post-Booking Follow-Up',
    description: 'Send follow-up emails',
    triggerEvent: 'BOOKING_COMPLETED',
    isActive: true,
    stages: [],
    _count: { automationExecutions: 5 },
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function makeStage(overrides: Record<string, unknown> = {}) {
  return {
    id: STAGE_ID,
    templateId: TEMPLATE_ID,
    name: 'Send Thank You Email',
    order: 0,
    automationType: 'SEND_EMAIL',
    automationConfig: { templateId: 'tmpl-001' },
    triggerTime: 'IMMEDIATE',
    triggerDays: null,
    progressionCondition: null,
    isOptional: false,
    ...overrides,
  };
}

function makeExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: EXECUTION_ID,
    tenantId: TENANT_ID,
    templateId: TEMPLATE_ID,
    bookingId: BOOKING_ID,
    triggerEvent: 'BOOKING_COMPLETED',
    triggerEventData: {},
    status: 'IN_PROGRESS',
    stageResults: null,
    error: null,
    startedAt: new Date('2026-01-15T10:00:00Z'),
    completedAt: null,
    template: makeTemplate(),
    booking: { id: BOOKING_ID, status: 'COMPLETED' },
    currentStage: null,
    ...overrides,
  };
}

// ===========================================================================
// TemplateService
// ===========================================================================
describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: ReturnType<typeof makePrismaForTemplate>;

  beforeEach(() => {
    prisma = makePrismaForTemplate();
    service = new TemplateService(prisma as never);
  });

  describe('list', () => {
    it('should return paginated templates', async () => {
      const templates = [makeTemplate()];
      prisma.workflowTemplate.findMany.mockResolvedValue(templates);
      prisma.workflowTemplate.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 10 });

      expect(result.data).toEqual(templates);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should use default pagination when not provided', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([]);
      prisma.workflowTemplate.count.mockResolvedValue(0);

      const result = await service.list(TENANT_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const created = makeTemplate();
      prisma.workflowTemplate.create.mockResolvedValue(created);

      const result = await service.create(TENANT_ID, {
        name: 'Post-Booking Follow-Up',
        triggerEvent: 'BOOKING_COMPLETED',
      });

      expect(result).toEqual(created);
      expect(prisma.workflowTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Post-Booking Follow-Up',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a template by ID', async () => {
      const template = makeTemplate();
      prisma.workflowTemplate.findUnique.mockResolvedValue(template);

      const result = await service.findOne(TEMPLATE_ID);

      expect(result).toEqual(template);
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const existing = makeTemplate();
      const updated = makeTemplate({ name: 'Updated Name' });
      prisma.workflowTemplate.findUnique.mockResolvedValue(existing);
      prisma.workflowTemplate.update.mockResolvedValue(updated);

      const result = await service.update(TEMPLATE_ID, {
        name: 'Updated Name',
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when template not found for update', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      const existing = makeTemplate();
      prisma.workflowTemplate.findUnique.mockResolvedValue(existing);
      prisma.workflowTemplate.update.mockResolvedValue({
        ...existing,
        isActive: false,
      });

      const result = await service.softDelete(TEMPLATE_ID);

      expect(result.isActive).toBe(false);
      expect(prisma.workflowTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { isActive: false },
      });
    });
  });

  describe('duplicate', () => {
    it('should create a copy with (Copy) suffix and isActive=false', async () => {
      const original = makeTemplate({
        stages: [makeStage()],
      });
      prisma.workflowTemplate.findUnique.mockResolvedValue(original);

      const copy = makeTemplate({
        id: 'template-copy',
        name: 'Post-Booking Follow-Up (Copy)',
        isActive: false,
      });
      prisma.workflowTemplate.create.mockResolvedValue(copy);

      const result = await service.duplicate(TEMPLATE_ID);

      expect(result.name).toBe('Post-Booking Follow-Up (Copy)');
      expect(result.isActive).toBe(false);
      expect(prisma.workflowTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Post-Booking Follow-Up (Copy)',
            isActive: false,
          }),
        }),
      );
    });
  });
});

// ===========================================================================
// ExecutionService
// ===========================================================================
describe('ExecutionService', () => {
  let service: ExecutionService;
  let prisma: ReturnType<typeof makePrismaForExecution>;

  beforeEach(() => {
    prisma = makePrismaForExecution();
    service = new ExecutionService(prisma as never);
  });

  describe('findOne', () => {
    it('should return an execution by ID', async () => {
      const execution = makeExecution();
      prisma.automationExecution.findUnique.mockResolvedValue(execution);

      const result = await service.findOne(EXECUTION_ID);

      expect(result).toEqual(execution);
    });

    it('should throw NotFoundException when execution not found', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('retry', () => {
    it('should reset a FAILED execution to PENDING', async () => {
      const execution = makeExecution({ status: 'FAILED' });
      prisma.automationExecution.findUnique.mockResolvedValue(execution);
      prisma.automationExecution.update.mockResolvedValue({
        ...execution,
        status: 'PENDING',
      });

      const result = await service.retry(EXECUTION_ID);

      expect(result.status).toBe('PENDING');
      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: { status: 'PENDING', error: null, completedAt: null },
      });
    });

    it('should throw BadRequestException when execution is not FAILED', async () => {
      const execution = makeExecution({ status: 'IN_PROGRESS' });
      prisma.automationExecution.findUnique.mockResolvedValue(execution);

      await expect(service.retry(EXECUTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkRetryFailed', () => {
    it('should return 0 retried when no failed executions exist', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([]);

      const result = await service.bulkRetryFailed(TENANT_ID);

      expect(result).toEqual({ retried: 0 });
      expect(prisma.automationExecution.updateMany).not.toHaveBeenCalled();
    });

    it('should reset all failed executions to PENDING', async () => {
      prisma.automationExecution.findMany.mockResolvedValue([
        { id: 'exec-1' },
        { id: 'exec-2' },
      ]);
      prisma.automationExecution.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkRetryFailed(TENANT_ID);

      expect(result).toEqual({ retried: 2 });
    });
  });

  describe('createExecution', () => {
    it('should create a new execution with IN_PROGRESS status', async () => {
      const created = makeExecution();
      prisma.automationExecution.create.mockResolvedValue(created);

      const result = await service.createExecution(
        TENANT_ID,
        TEMPLATE_ID,
        BOOKING_ID,
        'BOOKING_COMPLETED',
        { bookingId: BOOKING_ID },
      );

      expect(result).toEqual(created);
      expect(prisma.automationExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            templateId: TEMPLATE_ID,
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });
  });

  describe('updateStageResult', () => {
    it('should append a stage result to the execution', async () => {
      const execution = makeExecution({ stageResults: null });
      prisma.automationExecution.findUnique.mockResolvedValue(execution);
      prisma.automationExecution.update.mockResolvedValue(execution);

      await service.updateStageResult(EXECUTION_ID, STAGE_ID, {
        status: 'SUCCEEDED',
        executedAt: new Date('2026-01-15T10:05:00Z'),
        duration_ms: 1500,
      });

      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: EXECUTION_ID },
        data: {
          currentStageId: STAGE_ID,
          stageResults: [
            {
              stageId: STAGE_ID,
              status: 'SUCCEEDED',
              executedAt: '2026-01-15T10:05:00.000Z',
              duration_ms: 1500,
              error: undefined,
            },
          ],
        },
      });
    });

    it('should throw NotFoundException when execution not found', async () => {
      prisma.automationExecution.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStageResult('nonexistent', STAGE_ID, {
          status: 'SUCCEEDED',
          executedAt: new Date(),
          duration_ms: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeExecution', () => {
    it('should mark execution as SUCCEEDED', async () => {
      prisma.automationExecution.update.mockResolvedValue(
        makeExecution({ status: 'SUCCEEDED' }),
      );

      const result = await service.completeExecution(
        EXECUTION_ID,
        'SUCCEEDED',
      );

      expect(result.status).toBe('SUCCEEDED');
    });

    it('should mark execution as FAILED with error message', async () => {
      prisma.automationExecution.update.mockResolvedValue(
        makeExecution({ status: 'FAILED', error: 'timeout' }),
      );

      const result = await service.completeExecution(
        EXECUTION_ID,
        'FAILED',
        'timeout',
      );

      expect(result.status).toBe('FAILED');
    });
  });
});

// ===========================================================================
// StageService
// ===========================================================================
describe('StageService', () => {
  let service: StageService;
  let prisma: ReturnType<typeof makePrismaForStage>;

  beforeEach(() => {
    prisma = makePrismaForStage();
    service = new StageService(prisma as never);
  });

  describe('list', () => {
    it('should return stages ordered by order', async () => {
      const stages = [makeStage({ order: 0 }), makeStage({ id: 'stage-002', order: 1 })];
      prisma.workflowStage.findMany.mockResolvedValue(stages);

      const result = await service.list(TEMPLATE_ID);

      expect(result).toEqual(stages);
      expect(prisma.workflowStage.findMany).toHaveBeenCalledWith({
        where: { templateId: TEMPLATE_ID },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a stage with auto-incremented order', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.workflowStage.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      const created = makeStage({ order: 3 });
      prisma.workflowStage.create.mockResolvedValue(created);

      const result = await service.create(TEMPLATE_ID, {
        name: 'Send Thank You Email',
        automationType: 'SEND_EMAIL',
        automationConfig: {},
        triggerTime: 'IMMEDIATE',
      });

      expect(result.order).toBe(3);
    });

    it('should throw NotFoundException when template does not exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', {
          name: 'Test',
          automationType: 'SEND_EMAIL',
          automationConfig: {},
          triggerTime: 'IMMEDIATE',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a stage', async () => {
      const existing = makeStage();
      const updated = makeStage({ name: 'Updated Stage' });
      prisma.workflowStage.findUnique.mockResolvedValue(existing);
      prisma.workflowStage.update.mockResolvedValue(updated);

      const result = await service.update(STAGE_ID, {
        name: 'Updated Stage',
      });

      expect(result.name).toBe('Updated Stage');
    });

    it('should throw NotFoundException when stage not found', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('should reorder stages by the provided stageIds', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([
        makeStage({ id: 'a', order: 0 }),
        makeStage({ id: 'b', order: 1 }),
      ]);
      prisma.$transaction.mockResolvedValue([]);
      // list() call after reorder
      prisma.workflowStage.findMany.mockResolvedValueOnce([
        makeStage({ id: 'a', order: 0 }),
        makeStage({ id: 'b', order: 1 }),
      ]);

      await service.reorder(TEMPLATE_ID, ['b', 'a']);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when stageIds count mismatch', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([
        makeStage({ id: 'a' }),
        makeStage({ id: 'b' }),
      ]);

      await expect(
        service.reorder(TEMPLATE_ID, ['a']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unknown stage ID', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([
        makeStage({ id: 'a' }),
        makeStage({ id: 'b' }),
      ]);

      await expect(
        service.reorder(TEMPLATE_ID, ['a', 'unknown']),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
