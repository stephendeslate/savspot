import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Decimal } from '../../../../prisma/generated/prisma/runtime/library';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteLineItemDto } from './dto/create-quote-line-item.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteLineItemDto } from './dto/update-quote-line-item.dto';
import { AcceptQuoteDto } from './dto/accept-quote.dto';
import { ListQuotesDto } from './dto/list-quotes.dto';

interface LineItemForCalc {
  quantity: number;
  unitPrice: Decimal;
  taxRate: Decimal;
}

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private recalculateTotals(lineItems: LineItemForCalc[]) {
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of lineItems) {
      const lineTotal = item.quantity * item.unitPrice.toNumber();
      const lineTax = lineTotal * item.taxRate.toNumber();
      subtotal += lineTotal;
      taxTotal += lineTax;
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: Math.round((subtotal + taxTotal) * 100) / 100,
    };
  }

  async createQuote(tenantId: string, dto: CreateQuoteDto) {
    const lineItemsData = dto.lineItems ?? [];

    const totals = this.recalculateTotals(
      lineItemsData.map((item) => ({
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        taxRate: new Decimal(item.taxRate ?? 0),
      })),
    );

    const quote = await this.prisma.quote.create({
      data: {
        tenantId,
        bookingId: dto.bookingId,
        version: 1,
        status: 'DRAFT',
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        currency: dto.currency ?? 'USD',
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null,
        lineItems: lineItemsData.length > 0
          ? {
              create: lineItemsData.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate ?? 0,
                total: Math.round(
                  item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0)) * 100,
                ) / 100,
                sortOrder: item.sortOrder ?? index,
              })),
            }
          : undefined,
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Quote ${quote.id} created for tenant ${tenantId}`);

    return quote;
  }

  async getQuote(tenantId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        options: {
          include: {
            items: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async listQuotes(tenantId: string, filters: ListQuotesDto) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = { tenantId };

    if (status) {
      where.status = status as Prisma.QuoteWhereInput['status'];
    }

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          lineItems: {
            select: { id: true, description: true, total: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateQuote(tenantId: string, quoteId: string, dto: UpdateQuoteDto) {
    const quote = await this.getQuote(tenantId, quoteId);

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot update a quote with status ${quote.status}`,
      );
    }

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.validUntil !== undefined && {
          validUntil: new Date(dto.validUntil),
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });

    this.logger.log(`Quote ${quoteId} updated`);

    return updated;
  }

  async addLineItem(
    tenantId: string,
    quoteId: string,
    dto: CreateQuoteLineItemDto,
  ) {
    const quote = await this.getQuote(tenantId, quoteId);

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot add line items to a quote with status ${quote.status}`,
      );
    }

    const lineTotal =
      Math.round(dto.quantity * dto.unitPrice * (1 + (dto.taxRate ?? 0)) * 100) / 100;

    const lineItem = await this.prisma.quoteLineItem.create({
      data: {
        quoteId,
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        taxRate: dto.taxRate ?? 0,
        total: lineTotal,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    const allItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });

    const totals = this.recalculateTotals(allItems);

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
      },
    });

    this.logger.log(`Line item ${lineItem.id} added to quote ${quoteId}`);

    return lineItem;
  }

  async updateLineItem(
    tenantId: string,
    lineItemId: string,
    dto: UpdateQuoteLineItemDto,
  ) {
    const existing = await this.prisma.quoteLineItem.findUnique({
      where: { id: lineItemId },
      include: {
        quote: { select: { id: true, tenantId: true, status: true } },
      },
    });

    if (!existing || existing.quote.tenantId !== tenantId) {
      throw new NotFoundException('Quote line item not found');
    }

    if (existing.quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot update line items on a quote with status ${existing.quote.status}`,
      );
    }

    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? existing.unitPrice.toNumber();
    const taxRate = dto.taxRate ?? existing.taxRate.toNumber();
    const lineTotal = Math.round(quantity * unitPrice * (1 + taxRate) * 100) / 100;

    const updated = await this.prisma.quoteLineItem.update({
      where: { id: lineItemId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        total: lineTotal,
      },
    });

    const allItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId: existing.quote.id },
    });

    const totals = this.recalculateTotals(allItems);

    await this.prisma.quote.update({
      where: { id: existing.quote.id },
      data: {
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
      },
    });

    this.logger.log(`Line item ${lineItemId} updated`);

    return updated;
  }

  async deleteLineItem(tenantId: string, lineItemId: string) {
    const existing = await this.prisma.quoteLineItem.findUnique({
      where: { id: lineItemId },
      include: {
        quote: { select: { id: true, tenantId: true, status: true } },
      },
    });

    if (!existing || existing.quote.tenantId !== tenantId) {
      throw new NotFoundException('Quote line item not found');
    }

    if (existing.quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot delete line items from a quote with status ${existing.quote.status}`,
      );
    }

    await this.prisma.quoteLineItem.delete({
      where: { id: lineItemId },
    });

    const allItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId: existing.quote.id },
    });

    const totals = this.recalculateTotals(allItems);

    await this.prisma.quote.update({
      where: { id: existing.quote.id },
      data: {
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
      },
    });

    this.logger.log(`Line item ${lineItemId} deleted from quote ${existing.quote.id}`);

    return { deleted: true };
  }

  async reviseQuote(tenantId: string, quoteId: string) {
    const original = await this.getQuote(tenantId, quoteId);

    if (original.status !== 'SENT' && original.status !== 'REJECTED') {
      throw new BadRequestException(
        `Cannot revise a quote with status ${original.status}`,
      );
    }

    const newVersion = original.version + 1;

    const revised = await this.prisma.quote.create({
      data: {
        tenantId,
        bookingId: original.bookingId,
        version: newVersion,
        status: 'DRAFT',
        subtotal: original.subtotal,
        taxTotal: original.taxTotal,
        total: original.total,
        currency: original.currency,
        validUntil: original.validUntil,
        notes: original.notes,
        lineItems: {
          create: original.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(
      `Quote ${quoteId} revised to version ${newVersion} as quote ${revised.id}`,
    );

    return revised;
  }

  async sendQuote(tenantId: string, quoteId: string) {
    const quote = await this.getQuote(tenantId, quoteId);

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot send a quote with status ${quote.status}`,
      );
    }

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(`Quote ${quoteId} sent`);

    return updated;
  }

  async acceptQuote(tenantId: string, quoteId: string, dto: AcceptQuoteDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Row lock for concurrent safety
      const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM quotes WHERE id = ${quoteId} FOR UPDATE`;

      if (!Array.isArray(locked) || locked.length === 0) {
        throw new NotFoundException('Quote not found');
      }

      const quoteStatus = locked[0]!.status;

      if (quoteStatus !== 'SENT') {
        throw new BadRequestException(
          `Cannot accept a quote with status ${quoteStatus}`,
        );
      }

      if (dto.optionId) {
        const option = await tx.quoteOption.findFirst({
          where: { id: dto.optionId, quoteId },
        });

        if (!option) {
          throw new NotFoundException('Quote option not found');
        }

        await tx.quoteOption.update({
          where: { id: dto.optionId },
          data: { isSelected: true },
        });
      }

      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedSignature: dto.signatureData,
        },
      });

      this.logger.log(`Quote ${quoteId} accepted`);

      return updated;
    });
  }

  async sendReminder(tenantId: string, quoteId: string) {
    const quote = await this.getQuote(tenantId, quoteId);

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        `Cannot send reminder for a quote with status ${quote.status}`,
      );
    }

    // Find the booking to get the client as recipient
    const booking = quote.bookingId
      ? await this.prisma.booking.findUnique({
          where: { id: quote.bookingId },
          select: { clientId: true },
        })
      : null;

    if (!booking?.clientId) {
      throw new BadRequestException('Quote has no associated client to send reminder to');
    }

    await this.prisma.communication.create({
      data: {
        tenantId,
        recipientId: booking.clientId,
        channel: 'EMAIL',
        templateKey: 'quote-reminder',
        body: `Reminder: You have a pending quote totaling ${quote.total.toString()}. Please review and respond.`,
        status: 'QUEUED',
        metadata: {
          quoteId,
          quoteTotal: quote.total.toString(),
        },
      },
    });

    this.logger.log(`Quote reminder sent for quote ${quoteId}`);

    return { message: 'Reminder sent' };
  }

  async rejectQuote(tenantId: string, quoteId: string) {
    const quote = await this.getQuote(tenantId, quoteId);

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        `Cannot reject a quote with status ${quote.status}`,
      );
    }

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
      },
    });

    this.logger.log(`Quote ${quoteId} rejected`);

    return updated;
  }
}
