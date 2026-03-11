import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractsController, ContractTemplatesController } from './contracts.controller';
import { ContractsService } from './contracts.service';

const mockService = {
  listContracts: vi.fn(),
  createContract: vi.fn(),
  getContract: vi.fn(),
  sendContract: vi.fn(),
  signContract: vi.fn(),
  voidContract: vi.fn(),
  amendContract: vi.fn(),
  listTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
};

describe('ContractsController', () => {
  let controller: ContractsController;
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const contractId = '22222222-2222-2222-2222-222222222222';
  const userId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ContractsController(mockService as unknown as ContractsService);
  });

  it('should delegate listContracts to service', async () => {
    const query = { page: 1, limit: 20 };
    mockService.listContracts.mockResolvedValue({ data: [], meta: {} });

    await controller.listContracts(tenantId, query);

    expect(mockService.listContracts).toHaveBeenCalledWith(tenantId, query);
  });

  it('should delegate createContract to service', async () => {
    const dto = { templateId: 'tmpl-1', bookingId: 'bk-1' };
    mockService.createContract.mockResolvedValue({ id: contractId });

    await controller.createContract(tenantId, dto);

    expect(mockService.createContract).toHaveBeenCalledWith(tenantId, dto);
  });

  it('should delegate getContract to service', async () => {
    mockService.getContract.mockResolvedValue({ id: contractId });

    await controller.getContract(tenantId, contractId);

    expect(mockService.getContract).toHaveBeenCalledWith(tenantId, contractId);
  });

  it('should delegate sendContract to service', async () => {
    mockService.sendContract.mockResolvedValue({ status: 'SENT' });

    await controller.sendContract(tenantId, contractId);

    expect(mockService.sendContract).toHaveBeenCalledWith(tenantId, contractId);
  });

  it('should delegate signContract to service', async () => {
    const dto = {
      role: 'CLIENT' as const,
      signatureData: 'data:...',
      signatureType: 'DRAWN' as const,
      legalDisclosureAccepted: true as const,
    };
    mockService.signContract.mockResolvedValue({ contract: {}, signature: {} });

    await controller.signContract(tenantId, contractId, userId, dto);

    expect(mockService.signContract).toHaveBeenCalledWith(
      tenantId,
      contractId,
      userId,
      dto,
    );
  });

  it('should delegate voidContract to service', async () => {
    const dto = { reason: 'No longer needed' };
    mockService.voidContract.mockResolvedValue({ status: 'VOID' });

    await controller.voidContract(tenantId, contractId, userId, dto);

    expect(mockService.voidContract).toHaveBeenCalledWith(
      tenantId,
      contractId,
      userId,
      'No longer needed',
    );
  });

  it('should delegate amendContract to service', async () => {
    const dto = { reason: 'Scope change' };
    mockService.amendContract.mockResolvedValue({ status: 'REQUESTED' });

    await controller.amendContract(tenantId, contractId, userId, dto);

    expect(mockService.amendContract).toHaveBeenCalledWith(
      tenantId,
      contractId,
      userId,
      dto,
    );
  });
});

describe('ContractTemplatesController', () => {
  let controller: ContractTemplatesController;
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const templateId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ContractTemplatesController(
      mockService as unknown as ContractsService,
    );
  });

  it('should delegate listTemplates to service', async () => {
    mockService.listTemplates.mockResolvedValue([]);

    await controller.listTemplates(tenantId);

    expect(mockService.listTemplates).toHaveBeenCalledWith(tenantId);
  });

  it('should delegate createTemplate to service', async () => {
    const dto = { name: 'Test', content: 'Content' };
    mockService.createTemplate.mockResolvedValue({ id: templateId });

    await controller.createTemplate(tenantId, dto);

    expect(mockService.createTemplate).toHaveBeenCalledWith(tenantId, dto);
  });

  it('should delegate updateTemplate to service', async () => {
    const dto = { name: 'Updated' };
    mockService.updateTemplate.mockResolvedValue({ id: templateId });

    await controller.updateTemplate(tenantId, templateId, dto);

    expect(mockService.updateTemplate).toHaveBeenCalledWith(
      tenantId,
      templateId,
      dto,
    );
  });

  it('should delegate deleteTemplate to service', async () => {
    mockService.deleteTemplate.mockResolvedValue({ deleted: true });

    await controller.deleteTemplate(tenantId, templateId);

    expect(mockService.deleteTemplate).toHaveBeenCalledWith(
      tenantId,
      templateId,
    );
  });
});
