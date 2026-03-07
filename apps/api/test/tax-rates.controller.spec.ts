import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxRatesController } from '@/tax-rates/tax-rates.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TAX_RATE_ID = 'rate-001';

const makeService = () => ({
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TaxRatesController', () => {
  let controller: TaxRatesController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new TaxRatesController(service as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should call service.findAll with tenantId and return the result', async () => {
      const rates = [{ id: TAX_RATE_ID, name: 'Sales Tax' }];
      service.findAll.mockResolvedValue(rates);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(rates);
    });

    it('should return empty array when service returns empty', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should call service.create with tenantId and dto', async () => {
      const dto = { name: 'VAT', rate: 20 };
      const created = { id: TAX_RATE_ID, ...dto };
      service.create.mockResolvedValue(created);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(created);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should call service.update with tenantId, id, and dto', async () => {
      const dto = { name: 'Updated Tax' };
      const updated = { id: TAX_RATE_ID, name: 'Updated Tax' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(TENANT_ID, TAX_RATE_ID, dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, TAX_RATE_ID, dto);
      expect(result).toEqual(updated);
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('should call service.remove with tenantId and id', async () => {
      const removed = { id: TAX_RATE_ID, isActive: false };
      service.remove.mockResolvedValue(removed);

      const result = await controller.remove(TENANT_ID, TAX_RATE_ID);

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, TAX_RATE_ID);
      expect(result).toEqual(removed);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('should pass different tenant IDs independently', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('tenant-A');
      await controller.findAll('tenant-B');

      expect(service.findAll).toHaveBeenCalledWith('tenant-A');
      expect(service.findAll).toHaveBeenCalledWith('tenant-B');
      expect(service.findAll).toHaveBeenCalledTimes(2);
    });
  });
});
