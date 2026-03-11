import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ImportsService } from '@/imports/imports.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const IMPORT_JOB_ID = 'import-001';

function makePrisma() {
  return {
    importJob: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    importRecord: {
      findMany: vi.fn(),
    },
  };
}

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue({}),
  };
}

function makeImportJob(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT_JOB_ID,
    tenantId: TENANT_ID,
    sourcePlatform: 'CSV_GENERIC',
    importType: 'CLIENTS',
    status: 'PENDING',
    fileUrl: null,
    columnMapping: null,
    stats: null,
    errorLog: null,
    initiatedBy: USER_ID,
    createdAt: new Date('2026-03-10T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ImportsService', () => {
  let service: ImportsService;
  let prisma: ReturnType<typeof makePrisma>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    queue = makeQueue();
    service = new ImportsService(prisma as never, queue as never);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should create an import job and enqueue processing', async () => {
      const job = makeImportJob();
      prisma.importJob.create.mockResolvedValue(job);

      const result = await service.create(TENANT_ID, USER_ID, {
        sourcePlatform: 'CSV_GENERIC',
        importType: 'CLIENTS',
      }, null);

      expect(prisma.importJob.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          sourcePlatform: 'CSV_GENERIC',
          importType: 'CLIENTS',
          status: 'PENDING',
          fileUrl: null,
          columnMapping: 'DbNull',
          initiatedBy: USER_ID,
        },
      });
      expect(queue.add).toHaveBeenCalledWith('processImport', {
        importJobId: IMPORT_JOB_ID,
        tenantId: TENANT_ID,
      });
      expect(result.id).toBe(IMPORT_JOB_ID);
    });

    it('should pass column mapping when provided', async () => {
      const job = makeImportJob({ columnMapping: { name: 'full_name' } });
      prisma.importJob.create.mockResolvedValue(job);

      await service.create(TENANT_ID, USER_ID, {
        sourcePlatform: 'CSV_GENERIC',
        importType: 'CLIENTS',
        columnMapping: { name: 'full_name' },
      }, null);

      expect(prisma.importJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            columnMapping: { name: 'full_name' },
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated import jobs', async () => {
      const jobs = [makeImportJob()];
      prisma.importJob.findMany.mockResolvedValue(jobs);
      prisma.importJob.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, {});

      expect(prisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toEqual(jobs);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      prisma.importJob.findMany.mockResolvedValue([]);
      prisma.importJob.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'COMPLETED' });

      expect(prisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'COMPLETED' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------

  describe('findOne', () => {
    it('should return an import job with error records', async () => {
      const job = makeImportJob({ records: [] });
      prisma.importJob.findFirst.mockResolvedValue(job);

      const result = await service.findOne(TENANT_ID, IMPORT_JOB_ID);

      expect(prisma.importJob.findFirst).toHaveBeenCalledWith({
        where: { id: IMPORT_JOB_ID, tenantId: TENANT_ID },
        include: {
          records: {
            where: { status: 'ERROR' },
            take: 50,
            orderBy: { rowNumber: 'asc' },
          },
        },
      });
      expect(result.id).toBe(IMPORT_JOB_ID);
    });

    it('should throw NotFoundException for unknown import job', async () => {
      prisma.importJob.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getErrorReport
  // -----------------------------------------------------------------------

  describe('getErrorReport', () => {
    it('should return error report with records', async () => {
      prisma.importJob.findFirst.mockResolvedValue({
        id: IMPORT_JOB_ID,
        errorLog: { summary: '2 errors' },
      });
      prisma.importRecord.findMany.mockResolvedValue([
        { rowNumber: 3, errorMessage: 'Invalid email', rawData: {} },
      ]);

      const result = await service.getErrorReport(TENANT_ID, IMPORT_JOB_ID);

      expect(result.importJobId).toBe(IMPORT_JOB_ID);
      expect(result.totalErrors).toBe(1);
      expect(result.errors[0]?.rowNumber).toBe(3);
    });

    it('should throw NotFoundException when job not found', async () => {
      prisma.importJob.findFirst.mockResolvedValue(null);

      await expect(
        service.getErrorReport(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
