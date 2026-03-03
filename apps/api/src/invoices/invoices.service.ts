import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ListInvoicesDto } from './dto/list-invoices.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an invoice for a confirmed booking.
   *
   * Generates invoice number: INV-{YYYYMM}-{sequential}
   * Creates line item from the booking's service.
   */
  async createForBooking(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        service: {
          select: {
            name: true,
            durationMinutes: true,
            basePrice: true,
          },
        },
        payments: {
          where: { status: 'SUCCEEDED' },
          select: { id: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if invoice already exists for this booking
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { bookingId, tenantId },
    });

    if (existingInvoice) {
      this.logger.log(
        `Invoice already exists for booking ${bookingId}: ${existingInvoice.invoiceNumber}`,
      );
      return existingInvoice;
    }

    // Generate invoice number in a transaction to prevent duplicates
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `INV-${yearMonth}-`;

      // Find the max invoice number for this tenant this month
      const maxInvoice = await tx.invoice.findFirst({
        where: {
          tenantId,
          invoiceNumber: { startsWith: prefix },
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextSeq = 1;
      if (maxInvoice) {
        const parts = maxInvoice.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
        nextSeq = lastSeq + 1;
      }

      const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      const totalAmount = booking.totalAmount.toNumber();
      const hasSucceededPayment = booking.payments.length > 0;

      // Determine status based on payment
      const invoiceStatus = hasSucceededPayment ? 'PAID' : 'DRAFT';

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          bookingId,
          invoiceNumber,
          subtotal: totalAmount,
          taxAmount: 0,
          discountAmount: 0,
          total: totalAmount,
          amountPaid: hasSucceededPayment ? totalAmount : 0,
          currency: booking.currency,
          status: invoiceStatus,
          dueDate: booking.startTime,
        },
      });

      // Create line item from service
      const durationHours = booking.service.durationMinutes / 60;
      const description = `${booking.service.name} (${durationHours}h)`;

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description,
          quantity: 1,
          unitPrice: totalAmount,
          taxAmount: 0,
          discountAmount: 0,
          total: totalAmount,
          sortOrder: 0,
        },
      });

      this.logger.log(
        `Invoice ${invoiceNumber} created for booking ${bookingId}`,
      );

      return invoice;
    });
  }

  /**
   * List invoices for a tenant with optional filters.
   */
  async findAll(tenantId: string, filters: ListInvoicesDto) {
    const { status, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (status) {
      where.status = status as Prisma.InvoiceWhereInput['status'];
    }

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter ?? {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter ?? {}),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              startTime: true,
              service: { select: { id: true, name: true } },
              client: { select: { id: true, name: true, email: true } },
            },
          },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single invoice with full details.
   */
  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        booking: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            totalAmount: true,
            currency: true,
            service: {
              select: { id: true, name: true, durationMinutes: true },
            },
            client: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Mark an invoice as paid.
   */
  async markPaid(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status === 'PAID') {
      return invoice;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        amountPaid: invoice.total,
      },
    });
  }
}
