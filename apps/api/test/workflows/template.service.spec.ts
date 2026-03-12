import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TemplateService } from '@/workflows/services/template.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TEMPLATE_ID = 'template-001';

function makePrisma() {
  return {
    workflowTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: 'Post-Booking Flow',
    description: 'Automated post-booking sequence',
    triggerEvent: 'BOOKING_CONFIRMED',
    isActive: true,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    stages: [],
    _count: { automationExecutions: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new TemplateService(prisma as never);
  });

  // ---------- list ----------

  describe('list', () => {
    it('should return paginated results with meta', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([makeTemplate()]);
      prisma.workflowTemplate.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should use default page=1 and limit=20', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([]);
      prisma.workflowTemplate.count.mockResolvedValue(0);

      const result = await service.list(TENANT_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should calculate totalPages correctly', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([]);
      prisma.workflowTemplate.count.mockResolvedValue(45);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply skip/take for pagination', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([]);
      prisma.workflowTemplate.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 3, limit: 10 });

      const findManyArgs = prisma.workflowTemplate.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(20);
      expect(findManyArgs.take).toBe(10);
    });

    it('should filter by tenantId', async () => {
      prisma.workflowTemplate.findMany.mockResolvedValue([]);
      prisma.workflowTemplate.count.mockResolvedValue(0);

      await service.list(TENANT_ID, {});

      const findManyArgs = prisma.workflowTemplate.findMany.mock.calls[0]![0];
      expect(findManyArgs.where).toEqual({ tenantId: TENANT_ID });
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('should create template with defaults', async () => {
      prisma.workflowTemplate.create.mockResolvedValue(makeTemplate());

      const dto = {
        name: 'Post-Booking Flow',
        triggerEvent: 'BOOKING_CONFIRMED',
      };

      const result = await service.create(TENANT_ID, dto as never);

      expect(result.name).toBe('Post-Booking Flow');
      expect(prisma.workflowTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Post-Booking Flow',
            description: null,
            isActive: true,
          }),
        }),
      );
    });

    it('should use provided description and isActive', async () => {
      prisma.workflowTemplate.create.mockResolvedValue(
        makeTemplate({ isActive: false }),
      );

      await service.create(TENANT_ID, {
        name: 'Test',
        triggerEvent: 'BOOKING_CONFIRMED',
        description: 'A description',
        isActive: false,
      } as never);

      expect(prisma.workflowTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'A description',
            isActive: false,
          }),
        }),
      );
    });
  });

  // ---------- findOne ----------

  describe('findOne', () => {
    it('should return template when found', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(makeTemplate());

      const result = await service.findOne(TEMPLATE_ID);

      expect(result.id).toBe(TEMPLATE_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include stages ordered by order', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(makeTemplate());

      await service.findOne(TEMPLATE_ID);

      expect(prisma.workflowTemplate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: { orderBy: { order: 'asc' } },
          }),
        }),
      );
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('should throw NotFoundException when template does not exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.workflowTemplate.update.mockResolvedValue(
        makeTemplate({ name: 'Renamed' }),
      );

      await service.update(TEMPLATE_ID, { name: 'Renamed' } as never);

      expect(prisma.workflowTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEMPLATE_ID },
          data: { name: 'Renamed' },
        }),
      );
    });
  });

  // ---------- softDelete ----------

  describe('softDelete', () => {
    it('should throw NotFoundException when template does not exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set isActive to false', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.workflowTemplate.update.mockResolvedValue(
        makeTemplate({ isActive: false }),
      );

      await service.softDelete(TEMPLATE_ID);

      expect(prisma.workflowTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { isActive: false },
      });
    });
  });

  // ---------- duplicate ----------

  describe('duplicate', () => {
    it('should throw NotFoundException when original does not exist', async () => {
      prisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.duplicate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create copy with (Copy) suffix and isActive=false', async () => {
      const original = makeTemplate({
        stages: [
          {
            name: 'Step 1',
            order: 0,
            automationType: 'SEND_EMAIL',
            automationConfig: { key: 'val' },
            triggerTime: 'IMMEDIATELY',
            triggerDays: null,
            progressionCondition: null,
            isOptional: false,
          },
        ],
      });
      prisma.workflowTemplate.findUnique.mockResolvedValue(original);
      prisma.workflowTemplate.create.mockResolvedValue(
        makeTemplate({ name: 'Post-Booking Flow (Copy)', isActive: false }),
      );

      const result = await service.duplicate(TEMPLATE_ID);

      expect(result.name).toBe('Post-Booking Flow (Copy)');
      expect(prisma.workflowTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Post-Booking Flow (Copy)',
            isActive: false,
            stages: {
              create: [
                expect.objectContaining({
                  name: 'Step 1',
                  order: 0,
                }),
              ],
            },
          }),
        }),
      );
    });
  });
});
