import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuotesService } from './quotes.service';

// Mock the Decimal import
vi.mock('../../../../prisma/generated/prisma/runtime/library', () => ({
  Decimal: class MockDecimal {
    private value: number;
    constructor(val: number | string) {
      this.value = typeof val === 'string' ? parseFloat(val) : val;
    }
    toNumber() {
      return this.value;
    }
  },
}));

const mockPrisma = {
  quote: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  quoteLineItem: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  quoteOption: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
};

// Helper to create mock Decimal
function mockDecimal(val: number) {
  return { toNumber: () => val };
}

describe('QuotesService', () => {
  let service: QuotesService;
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const quoteId = '22222222-2222-2222-2222-222222222222';
  const bookingId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuotesService(mockPrisma as never);
  });

  describe('createQuote', () => {
    it('should create a quote with line items', async () => {
      const created = {
        id: quoteId,
        tenantId,
        bookingId,
        version: 1,
        status: 'DRAFT',
        subtotal: mockDecimal(300),
        taxTotal: mockDecimal(24),
        total: mockDecimal(324),
        currency: 'USD',
        lineItems: [
          {
            id: 'li-1',
            description: 'Service A',
            quantity: 2,
            unitPrice: mockDecimal(150),
            taxRate: mockDecimal(0.08),
            total: mockDecimal(324),
          },
        ],
      };

      mockPrisma.quote.create.mockResolvedValue(created);

      const result = await service.createQuote(tenantId, {
        bookingId,
        lineItems: [
          { description: 'Service A', quantity: 2, unitPrice: 150, taxRate: 0.08 },
        ],
      });

      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe(1);
      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            bookingId,
            version: 1,
            status: 'DRAFT',
            currency: 'USD',
          }),
        }),
      );
    });

    it('should create a quote without line items', async () => {
      mockPrisma.quote.create.mockResolvedValue({
        id: quoteId,
        status: 'DRAFT',
        subtotal: mockDecimal(0),
        total: mockDecimal(0),
        lineItems: [],
      });

      const result = await service.createQuote(tenantId, {
        bookingId,
      });

      expect(result.status).toBe('DRAFT');
    });
  });

  describe('total recalculation', () => {
    it('should correctly calculate totals for line items', async () => {
      // Access the private method via any cast for testing
      const recalc = (service as unknown as Record<string, unknown>)['recalculateTotals'] as (
        items: Array<{ quantity: number; unitPrice: { toNumber: () => number }; taxRate: { toNumber: () => number } }>,
      ) => { subtotal: number; taxTotal: number; total: number };

      const result = recalc([
        { quantity: 2, unitPrice: mockDecimal(100), taxRate: mockDecimal(0.1) },
        { quantity: 1, unitPrice: mockDecimal(50), taxRate: mockDecimal(0.05) },
      ]);

      // 2*100 = 200, tax = 20; 1*50 = 50, tax = 2.5
      expect(result.subtotal).toBe(250);
      expect(result.taxTotal).toBe(22.5);
      expect(result.total).toBe(272.5);
    });

    it('should handle zero items', async () => {
      const recalc = (service as unknown as Record<string, unknown>)['recalculateTotals'] as (
        items: Array<{ quantity: number; unitPrice: { toNumber: () => number }; taxRate: { toNumber: () => number } }>,
      ) => { subtotal: number; taxTotal: number; total: number };

      const result = recalc([]);

      expect(result.subtotal).toBe(0);
      expect(result.taxTotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('sendQuote', () => {
    it('should transition DRAFT to SENT', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        lineItems: [],
        options: [],
      });

      mockPrisma.quote.update.mockResolvedValue({
        id: quoteId,
        status: 'SENT',
        sentAt: new Date(),
      });

      const result = await service.sendQuote(tenantId, quoteId);

      expect(result.status).toBe('SENT');
    });

    it('should reject sending a non-DRAFT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'SENT',
        lineItems: [],
        options: [],
      });

      await expect(
        service.sendQuote(tenantId, quoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviseQuote', () => {
    it('should create a new version from a SENT quote', async () => {
      const original = {
        id: quoteId,
        tenantId,
        bookingId,
        version: 1,
        status: 'SENT',
        subtotal: mockDecimal(100),
        taxTotal: mockDecimal(8),
        total: mockDecimal(108),
        currency: 'USD',
        validUntil: null,
        notes: 'Original',
        lineItems: [
          {
            description: 'Service A',
            quantity: 1,
            unitPrice: mockDecimal(100),
            taxRate: mockDecimal(0.08),
            total: mockDecimal(108),
            sortOrder: 0,
          },
        ],
        options: [],
      };

      mockPrisma.quote.findFirst.mockResolvedValue(original);
      mockPrisma.quote.create.mockResolvedValue({
        id: 'new-quote-id',
        version: 2,
        status: 'DRAFT',
        lineItems: original.lineItems,
      });

      const result = await service.reviseQuote(tenantId, quoteId);

      expect(result.version).toBe(2);
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 2,
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should reject revising a DRAFT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        lineItems: [],
        options: [],
      });

      await expect(
        service.reviseQuote(tenantId, quoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptQuote', () => {
    it('should accept a SENT quote with row lock', async () => {
      const mockTx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ id: quoteId, status: 'SENT' }]),
        quoteOption: {
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        quote: {
          update: vi.fn().mockResolvedValue({
            id: quoteId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      const result = await service.acceptQuote(tenantId, quoteId, {
        signatureData: 'data:image/svg+xml;base64,...',
      });

      expect(result.status).toBe('ACCEPTED');
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });

    it('should reject accepting a non-SENT quote', async () => {
      const mockTx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ id: quoteId, status: 'DRAFT' }]),
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      await expect(
        service.acceptQuote(tenantId, quoteId, {
          signatureData: 'data:...',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectQuote', () => {
    it('should reject a SENT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'SENT',
        lineItems: [],
        options: [],
      });

      mockPrisma.quote.update.mockResolvedValue({
        id: quoteId,
        status: 'REJECTED',
      });

      const result = await service.rejectQuote(tenantId, quoteId);

      expect(result.status).toBe('REJECTED');
    });

    it('should reject rejecting a non-SENT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        lineItems: [],
        options: [],
      });

      await expect(
        service.rejectQuote(tenantId, quoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listQuotes', () => {
    it('should return paginated quotes', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([
        { id: '1', status: 'DRAFT' },
      ]);
      mockPrisma.quote.count.mockResolvedValue(1);

      const result = await service.listQuotes(tenantId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateQuote', () => {
    it('should update a DRAFT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        lineItems: [],
        options: [],
      });

      mockPrisma.quote.update.mockResolvedValue({
        id: quoteId,
        notes: 'Updated',
      });

      const result = await service.updateQuote(tenantId, quoteId, {
        notes: 'Updated',
      });

      expect(result.notes).toBe('Updated');
    });

    it('should reject updating a non-DRAFT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'SENT',
        lineItems: [],
        options: [],
      });

      await expect(
        service.updateQuote(tenantId, quoteId, { notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addLineItem', () => {
    it('should add line item and recalculate totals', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        lineItems: [],
        options: [],
      });

      mockPrisma.quoteLineItem.create.mockResolvedValue({
        id: 'li-1',
        description: 'New item',
        quantity: 1,
        unitPrice: mockDecimal(100),
      });

      mockPrisma.quoteLineItem.findMany.mockResolvedValue([
        {
          quantity: 1,
          unitPrice: mockDecimal(100),
          taxRate: mockDecimal(0.1),
        },
      ]);

      mockPrisma.quote.update.mockResolvedValue({ id: quoteId });

      await service.addLineItem(tenantId, quoteId, {
        description: 'New item',
        quantity: 1,
        unitPrice: 100,
        taxRate: 0.1,
      });

      expect(mockPrisma.quoteLineItem.create).toHaveBeenCalled();
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 100,
            taxTotal: 10,
            total: 110,
          }),
        }),
      );
    });

    it('should reject adding to a non-DRAFT quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: quoteId,
        tenantId,
        status: 'SENT',
        lineItems: [],
        options: [],
      });

      await expect(
        service.addLineItem(tenantId, quoteId, {
          description: 'test',
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteLineItem', () => {
    it('should delete line item and recalculate totals', async () => {
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue({
        id: 'li-1',
        quoteId,
        quote: { id: quoteId, tenantId, status: 'DRAFT' },
      });

      mockPrisma.quoteLineItem.delete.mockResolvedValue({ id: 'li-1' });

      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);

      mockPrisma.quote.update.mockResolvedValue({ id: quoteId });

      const result = await service.deleteLineItem(tenantId, 'li-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 0,
            taxTotal: 0,
            total: 0,
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent item', async () => {
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteLineItem(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
