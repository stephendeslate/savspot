import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportsController } from '@/imports/imports.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const IMPORT_JOB_ID = 'import-001';

const makeService = () => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  getErrorReport: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ImportsController', () => {
  let controller: ImportsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new ImportsController(service as never);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should call service.create with correct arguments', async () => {
      const dto = {
        sourcePlatform: 'CSV_GENERIC' as const,
        importType: 'CLIENTS' as const,
      };
      const created = { id: IMPORT_JOB_ID, ...dto };
      service.create.mockResolvedValue(created);

      const result = await controller.create(TENANT_ID, USER_ID, dto);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, USER_ID, dto, null);
      expect(result).toEqual(created);
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should call service.findAll with tenantId and query', async () => {
      const query = { page: 1, limit: 20 };
      const response = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAll.mockResolvedValue(response);

      const result = await controller.findAll(TENANT_ID, query);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, query);
      expect(result).toEqual(response);
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------

  describe('findOne', () => {
    it('should call service.findOne with tenantId and id', async () => {
      const job = { id: IMPORT_JOB_ID };
      service.findOne.mockResolvedValue(job);

      const result = await controller.findOne(TENANT_ID, IMPORT_JOB_ID);

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, IMPORT_JOB_ID);
      expect(result).toEqual(job);
    });
  });

  // -----------------------------------------------------------------------
  // getErrors
  // -----------------------------------------------------------------------

  describe('getErrors', () => {
    it('should call service.getErrorReport with tenantId and id', async () => {
      const report = { importJobId: IMPORT_JOB_ID, errors: [], totalErrors: 0 };
      service.getErrorReport.mockResolvedValue(report);

      const result = await controller.getErrors(TENANT_ID, IMPORT_JOB_ID);

      expect(service.getErrorReport).toHaveBeenCalledWith(TENANT_ID, IMPORT_JOB_ID);
      expect(result).toEqual(report);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('should pass different tenant IDs independently', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: {} });
      const query = {};

      await controller.findAll('tenant-A', query);
      await controller.findAll('tenant-B', query);

      expect(service.findAll).toHaveBeenCalledWith('tenant-A', query);
      expect(service.findAll).toHaveBeenCalledWith('tenant-B', query);
    });
  });
});
