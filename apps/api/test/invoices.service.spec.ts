import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from '@/invoices/invoices.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const BOOKING_ID = 'booking-001';
const INVOICE_ID = 'invoice-001';

function makePrisma() {
  return {
    booking: { findFirst: vi.fn() },
    invoice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceLineItem: { create: vi.fn() },
    $transaction: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new InvoicesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // createForBooking
  // -----------------------------------------------------------------------

  describe('createForBooking', () => {
    const mockBookingData = {
      id: BOOKING_ID,
      tenantId: TENANT_ID,
      totalAmount: { toNumber: () => 50 },
      currency: 'USD',
      startTime: new Date('2026-03-15T10:00:00Z'),
      service: { name: 'Haircut', durationMinutes: 60, basePrice: { toNumber: () => 50 } },
      payments: [],
    };

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.createForBooking(TENANT_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return existing invoice if one already exists', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBookingData);
      prisma.invoice.findFirst.mockResolvedValue({
        id: INVOICE_ID,
        invoiceNumber: 'INV-202603-0001',
      });

      const result = await service.createForBooking(TENANT_ID, BOOKING_ID);
      expect(result.invoiceNumber).toBe('INV-202603-0001');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should generate sequential invoice number', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBookingData);
      prisma.invoice.findFirst.mockResolvedValue(null); // no existing invoice

      const createdInvoice = { id: INVOICE_ID, invoiceNumber: 'INV-202603-0001' };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          invoice: {
            findFirst: vi.fn().mockResolvedValue(null), // no previous this month
            create: vi.fn().mockResolvedValue(createdInvoice),
          },
          invoiceLineItem: { create: vi.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createForBooking(TENANT_ID, BOOKING_ID);
      expect(result.invoiceNumber).toMatch(/^INV-\d{6}-0001$/);
    });

    it('should increment sequence from existing invoices', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBookingData);
      prisma.invoice.findFirst.mockResolvedValue(null);

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          invoice: {
            findFirst: vi.fn().mockResolvedValue({ invoiceNumber: 'INV-202603-0005' }),
            create: vi.fn().mockImplementation((args: { data: { invoiceNumber: string } }) => ({
              id: INVOICE_ID,
              invoiceNumber: args.data.invoiceNumber,
            })),
          },
          invoiceLineItem: { create: vi.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createForBooking(TENANT_ID, BOOKING_ID);
      expect(result.invoiceNumber).toMatch(/-0006$/);
    });

    it('should set status to PAID when succeeded payment exists', async () => {
      const bookingWithPayment = {
        ...mockBookingData,
        payments: [{ id: 'pay-1' }],
      };
      prisma.booking.findFirst.mockResolvedValue(bookingWithPayment);
      prisma.invoice.findFirst.mockResolvedValue(null);

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          invoice: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((args: { data: { status: string } }) => ({
              id: INVOICE_ID,
              status: args.data.status,
            })),
          },
          invoiceLineItem: { create: vi.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createForBooking(TENANT_ID, BOOKING_ID);
      expect(result.status).toBe('PAID');
    });

    it('should set status to DRAFT when no succeeded payment', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBookingData);
      prisma.invoice.findFirst.mockResolvedValue(null);

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          invoice: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((args: { data: { status: string } }) => ({
              id: INVOICE_ID,
              status: args.data.status,
            })),
          },
          invoiceLineItem: { create: vi.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createForBooking(TENANT_ID, BOOKING_ID);
      expect(result.status).toBe('DRAFT');
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated results', async () => {
      prisma.invoice.findMany.mockResolvedValue([{ id: INVOICE_ID }]);
      prisma.invoice.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('should apply status filter', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'PAID', page: 1, limit: 10 });
      const where = prisma.invoice.findMany.mock.calls[0]![0].where;
      expect(where.status).toBe('PAID');
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    it('should return invoice when found', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: INVOICE_ID, status: 'PAID', total: 50 });
      const result = await service.findById(TENANT_ID, INVOICE_ID);
      expect(result.id).toBe(INVOICE_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      await expect(service.findById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // markPaid
  // -----------------------------------------------------------------------

  describe('markPaid', () => {
    it('should return invoice as-is if already PAID', async () => {
      const paidInvoice = { id: INVOICE_ID, status: 'PAID', total: 50 };
      prisma.invoice.findFirst.mockResolvedValue(paidInvoice);

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);
      expect(result.status).toBe('PAID');
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should update status to PAID for DRAFT invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: INVOICE_ID, status: 'DRAFT', total: 50,
      });
      prisma.invoice.update.mockResolvedValue({ id: INVOICE_ID, status: 'PAID' });

      const result = await service.markPaid(TENANT_ID, INVOICE_ID);
      expect(result.status).toBe('PAID');
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });
  });
});
