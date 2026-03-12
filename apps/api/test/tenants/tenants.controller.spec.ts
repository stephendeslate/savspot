import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantsController } from '@/tenants/tenants.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTenantsService() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    applyPreset: vi.fn(),
    requestExport: vi.fn(),
    deactivate: vi.fn(),
  };
}

describe('TenantsController', () => {
  let controller: TenantsController;
  let tenantsService: ReturnType<typeof makeTenantsService>;

  beforeEach(() => {
    tenantsService = makeTenantsService();
    controller = new TenantsController(tenantsService as never);
  });

  it('create delegates to service with userId and dto', async () => {
    const dto = { name: 'New Salon' };
    tenantsService.create.mockResolvedValue({ id: 't-1', name: 'New Salon' });

    const result = await controller.create('user-1', dto as never);

    expect(tenantsService.create).toHaveBeenCalledWith('user-1', dto);
    expect(result.id).toBe('t-1');
  });

  it('findById delegates to service', async () => {
    tenantsService.findById.mockResolvedValue({ id: 't-1' });

    const result = await controller.findById('t-1');

    expect(tenantsService.findById).toHaveBeenCalledWith('t-1');
    expect(result.id).toBe('t-1');
  });

  it('update delegates to service', async () => {
    tenantsService.update.mockResolvedValue({ id: 't-1', name: 'Updated' });

    const result = await controller.update('t-1', { name: 'Updated' } as never);

    expect(tenantsService.update).toHaveBeenCalledWith('t-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('applyPreset delegates to service', async () => {
    tenantsService.applyPreset.mockResolvedValue({ servicesCreated: 3 });

    const result = await controller.applyPreset('t-1', { category: 'SALON' } as never);

    expect(tenantsService.applyPreset).toHaveBeenCalledWith('t-1', 'SALON');
    expect(result.servicesCreated).toBe(3);
  });

  it('requestExport delegates to service', async () => {
    tenantsService.requestExport.mockResolvedValue({ id: 'dr-1' });

    const result = await controller.requestExport('t-1', 'user-1');

    expect(tenantsService.requestExport).toHaveBeenCalledWith('t-1', 'user-1');
    expect(result.id).toBe('dr-1');
  });

  it('deactivate delegates to service', async () => {
    tenantsService.deactivate.mockResolvedValue({ status: 'DEACTIVATED' });

    const result = await controller.deactivate('t-1', 'user-1');

    expect(tenantsService.deactivate).toHaveBeenCalledWith('t-1', 'user-1');
    expect(result.status).toBe('DEACTIVATED');
  });
});
