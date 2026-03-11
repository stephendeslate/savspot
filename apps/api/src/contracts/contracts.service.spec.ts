import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { createHash } from 'crypto';

const mockPrisma = {
  contractTemplate: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  contract: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  contractSignature: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  contractAmendment: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
};

describe('ContractsService', () => {
  let service: ContractsService;
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const contractId = '22222222-2222-2222-2222-222222222222';
  const templateId = '33333333-3333-3333-3333-333333333333';
  const userId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContractsService(mockPrisma as never);
  });

  describe('createContract', () => {
    it('should create a contract from template', async () => {
      const template = {
        id: templateId,
        tenantId,
        name: 'Test Template',
        content: '<p>Contract body</p>',
        isActive: true,
      };

      mockPrisma.contractTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.contract.create.mockResolvedValue({
        id: contractId,
        tenantId,
        bookingId: 'booking-1',
        templateId,
        content: template.content,
        status: 'DRAFT',
        template: { id: templateId, name: 'Test Template' },
      });

      const result = await service.createContract(tenantId, {
        templateId,
        bookingId: 'booking-1',
      });

      expect(result.status).toBe('DRAFT');
      expect(result.content).toBe(template.content);
      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            templateId,
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should use custom content when provided', async () => {
      const template = {
        id: templateId,
        tenantId,
        name: 'Test Template',
        content: '<p>Template content</p>',
        isActive: true,
      };

      mockPrisma.contractTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.contract.create.mockResolvedValue({
        id: contractId,
        content: '<p>Custom content</p>',
        status: 'DRAFT',
      });

      await service.createContract(tenantId, {
        templateId,
        bookingId: 'booking-1',
        content: '<p>Custom content</p>',
      });

      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: '<p>Custom content</p>',
          }),
        }),
      );
    });

    it('should throw NotFoundException if template not found', async () => {
      mockPrisma.contractTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.createContract(tenantId, {
          templateId,
          bookingId: 'booking-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendContract', () => {
    it('should send a DRAFT contract and compute hash', async () => {
      const content = '<p>Contract body</p>';
      const expectedHash = createHash('sha256').update(content).digest('hex');

      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'DRAFT',
        content,
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      mockPrisma.contract.update.mockResolvedValue({
        id: contractId,
        status: 'SENT',
      });

      const result = await service.sendContract(tenantId, contractId);

      expect(result.status).toBe('SENT');
      expect(result.documentHash).toBe(expectedHash);
      expect(mockPrisma.contract.update).toHaveBeenCalledWith({
        where: { id: contractId },
        data: { status: 'SENT' },
      });
    });

    it('should throw BadRequestException if not DRAFT', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'SENT',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      await expect(
        service.sendContract(tenantId, contractId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signContract', () => {
    it('should sign and fully complete when all requirements met', async () => {
      const signatureRequirements = { CLIENT: 1 };

      const mockTx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ id: contractId, status: 'SENT' }]),
        contractSignature: {
          create: vi.fn().mockResolvedValue({ id: 'sig-1', role: 'CLIENT' }),
          findMany: vi.fn().mockResolvedValue([{ role: 'CLIENT' }]),
        },
        contract: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ templateId }),
          update: vi.fn().mockResolvedValue({ id: contractId, status: 'SIGNED' }),
        },
        contractTemplate: {
          findFirst: vi.fn().mockResolvedValue({ signatureRequirements }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      const result = await service.signContract(tenantId, contractId, userId, {
        role: 'CLIENT',
        signatureData: 'data:image/svg+xml;base64,...',
        signatureType: 'DRAWN',
        legalDisclosureAccepted: true,
      });

      expect(result.contract.status).toBe('SIGNED');
      expect(mockTx.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SIGNED' }),
        }),
      );
    });

    it('should set PARTIALLY_SIGNED when not all requirements met', async () => {
      const signatureRequirements = { CLIENT: 1, COMPANY_REP: 1 };

      const mockTx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ id: contractId, status: 'SENT' }]),
        contractSignature: {
          create: vi.fn().mockResolvedValue({ id: 'sig-1', role: 'CLIENT' }),
          findMany: vi.fn().mockResolvedValue([{ role: 'CLIENT' }]),
        },
        contract: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ templateId }),
          update: vi.fn().mockResolvedValue({ id: contractId, status: 'PARTIALLY_SIGNED' }),
        },
        contractTemplate: {
          findFirst: vi.fn().mockResolvedValue({ signatureRequirements }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      const result = await service.signContract(tenantId, contractId, userId, {
        role: 'CLIENT',
        signatureData: 'data:image/svg+xml;base64,...',
        signatureType: 'DRAWN',
        legalDisclosureAccepted: true,
      });

      expect(result.contract.status).toBe('PARTIALLY_SIGNED');
    });

    it('should throw BadRequestException if contract not in signable state', async () => {
      const mockTx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ id: contractId, status: 'DRAFT' }]),
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      await expect(
        service.signContract(tenantId, contractId, userId, {
          role: 'CLIENT',
          signatureData: 'data:image/svg+xml;base64,...',
          signatureType: 'DRAWN',
          legalDisclosureAccepted: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('voidContract', () => {
    it('should void a SIGNED contract', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'SIGNED',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      mockPrisma.contract.update.mockResolvedValue({
        id: contractId,
        status: 'VOID',
        voidedBy: userId,
        voidReason: 'Client request',
      });

      const result = await service.voidContract(
        tenantId,
        contractId,
        userId,
        'Client request',
      );

      expect(result.status).toBe('VOID');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'VOID',
            voidedBy: userId,
            voidReason: 'Client request',
          }),
        }),
      );
    });

    it('should void a DRAFT contract', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'DRAFT',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      mockPrisma.contract.update.mockResolvedValue({
        id: contractId,
        status: 'VOID',
      });

      const result = await service.voidContract(
        tenantId,
        contractId,
        userId,
        'No longer needed',
      );

      expect(result.status).toBe('VOID');
    });

    it('should throw BadRequestException if already voided', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'VOID',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      await expect(
        service.voidContract(tenantId, contractId, userId, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('amendContract', () => {
    it('should amend a SIGNED contract', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'SIGNED',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      const amendment = {
        id: 'amendment-1',
        contractId,
        requestedBy: userId,
        status: 'REQUESTED',
        reason: 'Scope change',
      };

      mockPrisma.$transaction.mockResolvedValue([amendment, { id: contractId }]);

      const result = await service.amendContract(tenantId, contractId, userId, {
        reason: 'Scope change',
      });

      expect(result.status).toBe('REQUESTED');
    });

    it('should throw BadRequestException if not SIGNED', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: contractId,
        tenantId,
        status: 'DRAFT',
        content: 'test',
        template: { id: templateId, name: 'Test', signatureRequirements: null },
        signatures: [],
        amendments: [],
      });

      await expect(
        service.amendContract(tenantId, contractId, userId, {
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listContracts', () => {
    it('should return paginated contracts', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        { id: '1', status: 'DRAFT' },
        { id: '2', status: 'SENT' },
      ]);
      mockPrisma.contract.count.mockResolvedValue(2);

      const result = await service.listContracts(tenantId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);
      mockPrisma.contract.count.mockResolvedValue(0);

      await service.listContracts(tenantId, {
        status: 'DRAFT',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });
  });

  describe('Template CRUD', () => {
    it('should list active templates', async () => {
      mockPrisma.contractTemplate.findMany.mockResolvedValue([
        { id: templateId, name: 'Template 1', isActive: true },
      ]);

      const result = await service.listTemplates(tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.contractTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should soft-delete a template', async () => {
      mockPrisma.contractTemplate.findFirst.mockResolvedValue({
        id: templateId,
        tenantId,
        isActive: true,
      });
      mockPrisma.contractTemplate.update.mockResolvedValue({
        id: templateId,
        isActive: false,
      });

      const result = await service.deleteTemplate(tenantId, templateId);

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.contractTemplate.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when deleting non-existent template', async () => {
      mockPrisma.contractTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTemplate(tenantId, templateId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
