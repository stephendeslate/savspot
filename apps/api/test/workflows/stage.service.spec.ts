import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StageService } from '@/workflows/services/stage.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEMPLATE_ID = 'template-001';
const STAGE_ID = 'stage-001';

function makePrisma() {
  return {
    workflowTemplate: {
      findUnique: vi.fn(),
    },
    workflowStage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeStage(overrides: Record<string, unknown> = {}) {
  return {
    id: STAGE_ID,
    templateId: TEMPLATE_ID,
    name: 'Send Confirmation',
    order: 0,
    automationType: 'SEND_EMAIL',
    automationConfig: { template: 'confirm' },
    triggerTime: 'IMMEDIATELY',
    triggerDays: null,
    progressionCondition: null,
    isOptional: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StageService', () => {
  let service: StageService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new StageService(prisma as never);
  });

  // ---------- list ----------

  describe('list', () => {
    it('should return stages ordered by order', async () => {
      const stages = [makeStage(), makeStage({ id: 'stage-002', order: 1 })];
      prisma.workflowStage.findMany.mockResolvedValue(stages);

      const result = await service.list(TEMPLATE_ID);

      expect(result).toHaveLength(2);
      expect(prisma.workflowStage.findMany).toHaveBeenCalledWith({
        where: { templateId: TEMPLATE_ID },
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array when no stages exist', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([]);

      const result = await service.list(TEMPLATE_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('should throw NotFoundException when template does not exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.create(TEMPLATE_ID, { name: 'Step 1' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create stage with auto-incremented order', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue({ id: TEMPLATE_ID });
      prisma.workflowStage.aggregate.mockResolvedValue({ _max: { order: 2 } });
      prisma.workflowStage.create.mockResolvedValue(makeStage({ order: 3 }));

      const dto = {
        name: 'Send Reminder',
        automationType: 'SEND_EMAIL',
        triggerTime: 'IMMEDIATELY',
      };

      const result = await service.create(TEMPLATE_ID, dto as never);

      expect(result.order).toBe(3);
      expect(prisma.workflowStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: TEMPLATE_ID,
            name: 'Send Reminder',
            order: 3,
          }),
        }),
      );
    });

    it('should start at order 0 when no stages exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue({ id: TEMPLATE_ID });
      prisma.workflowStage.aggregate.mockResolvedValue({ _max: { order: null } });
      prisma.workflowStage.create.mockResolvedValue(makeStage({ order: 0 }));

      await service.create(TEMPLATE_ID, { name: 'First Step' } as never);

      expect(prisma.workflowStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 0 }),
        }),
      );
    });

    it('should apply defaults for optional fields', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue({ id: TEMPLATE_ID });
      prisma.workflowStage.aggregate.mockResolvedValue({ _max: { order: null } });
      prisma.workflowStage.create.mockResolvedValue(makeStage());

      await service.create(TEMPLATE_ID, {
        name: 'Step',
        automationType: 'SEND_EMAIL',
        triggerTime: 'IMMEDIATELY',
      } as never);

      expect(prisma.workflowStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            triggerDays: null,
            progressionCondition: null,
            isOptional: false,
          }),
        }),
      );
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('should throw NotFoundException when stage does not exist', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(makeStage());
      prisma.workflowStage.update.mockResolvedValue(
        makeStage({ name: 'Updated Name' }),
      );

      await service.update(STAGE_ID, { name: 'Updated Name' } as never);

      expect(prisma.workflowStage.update).toHaveBeenCalledWith({
        where: { id: STAGE_ID },
        data: { name: 'Updated Name' },
      });
    });

    it('should handle updating all fields at once', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(makeStage());
      prisma.workflowStage.update.mockResolvedValue(makeStage());

      await service.update(STAGE_ID, {
        name: 'New',
        automationType: 'WEBHOOK',
        automationConfig: { url: 'https://example.com' },
        triggerTime: 'BEFORE_APPOINTMENT',
        triggerDays: 1,
        progressionCondition: 'AUTO',
        isOptional: true,
      } as never);

      expect(prisma.workflowStage.update).toHaveBeenCalledWith({
        where: { id: STAGE_ID },
        data: expect.objectContaining({
          name: 'New',
          automationType: 'WEBHOOK',
          triggerDays: 1,
          isOptional: true,
        }),
      });
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('should throw NotFoundException when stage does not exist', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete stage and reorder remaining in transaction', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(makeStage());
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          workflowStage: {
            delete: vi.fn(),
            findMany: vi.fn().mockResolvedValue([
              makeStage({ id: 'stage-002', order: 2 }),
            ]),
            update: vi.fn(),
          },
        };
        return fn(tx);
      });

      await service.remove(STAGE_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should not update stages that already have correct order', async () => {
      prisma.workflowStage.findUnique.mockResolvedValue(makeStage());

      const txUpdate = vi.fn();
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          workflowStage: {
            delete: vi.fn(),
            findMany: vi.fn().mockResolvedValue([
              makeStage({ id: 'stage-002', order: 0 }),
              makeStage({ id: 'stage-003', order: 1 }),
            ]),
            update: txUpdate,
          },
        };
        return fn(tx);
      });

      await service.remove(STAGE_ID);

      expect(txUpdate).not.toHaveBeenCalled();
    });
  });

  // ---------- reorder ----------

  describe('reorder', () => {
    it('should throw BadRequestException when stageIds length mismatch', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([
        makeStage(),
        makeStage({ id: 'stage-002' }),
      ]);

      await expect(
        service.reorder(TEMPLATE_ID, [STAGE_ID]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when stageId does not belong to template', async () => {
      prisma.workflowStage.findMany.mockResolvedValue([
        makeStage(),
        makeStage({ id: 'stage-002' }),
      ]);

      await expect(
        service.reorder(TEMPLATE_ID, [STAGE_ID, 'foreign-stage']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update order for each stage in a transaction', async () => {
      const stages = [
        makeStage({ id: 'stage-a' }),
        makeStage({ id: 'stage-b' }),
      ];
      prisma.workflowStage.findMany
        .mockResolvedValueOnce(stages) // for reorder validation
        .mockResolvedValueOnce(stages); // for list() at end

      prisma.$transaction.mockResolvedValue([{}, {}]);

      await service.reorder(TEMPLATE_ID, ['stage-b', 'stage-a']);

      // $transaction is called with an array of 2 update calls
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const txArg = prisma.$transaction.mock.calls[0]![0] as unknown[];
      expect(txArg).toHaveLength(2);
    });
  });
});
