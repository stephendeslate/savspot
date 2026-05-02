import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { sanitizeColor } from '../common/utils/sanitize-color';

export interface GenerateInvoicePdfPayload {
  tenantId: string;
  invoiceId: string;
}

/**
 * Renders an invoice into HTML, uploads it to storage (R2/Supabase), and
 * persists the resulting URL on the Invoice row. Falls back to inline
 * data: URI when the upload provider is unavailable.
 *
 * Phase 4n: extracted from the BullMQ GenerateInvoicePdfProcessor so both
 * the BullMQ side (during the soak window) and the Inngest function
 * (`invoices/generateInvoicePdf`) delegate to a single implementation.
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async generateAndUpload(payload: GenerateInvoicePdfPayload): Promise<void> {
    const { tenantId, invoiceId } = payload;
    this.logger.log(`Generating invoice PDF for ${invoiceId}...`);

    try {
      const invoice = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          include: {
            lineItems: {
              orderBy: { sortOrder: 'asc' },
            },
            booking: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                service: {
                  select: { id: true, name: true },
                },
                client: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
            tenant: {
              select: {
                name: true,
                slug: true,
                logoUrl: true,
                brandColor: true,
              },
            },
          },
        });
      });

      if (!invoice) {
        this.logger.warn(`Invoice ${invoiceId} not found, skipping PDF generation`);
        return;
      }

      const html = this.generateInvoiceHtml(invoice);
      const htmlBuffer = Buffer.from(html, 'utf-8');

      let pdfUrl: string;
      try {
        const uploadResult = await this.uploadService.getPresignedUploadUrl({
          tenantId,
          fileName: `invoice-${invoice.invoiceNumber}.html`,
          contentType: 'text/html',
        });

        const response = await fetch(uploadResult.uploadUrl, {
          method: 'PUT',
          body: htmlBuffer,
          headers: { 'Content-Type': 'text/html' },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        pdfUrl = uploadResult.publicUrl;
        this.logger.log(
          `Invoice ${invoice.invoiceNumber} uploaded: ${pdfUrl}`,
        );
      } catch (uploadError) {
        this.logger.warn(
          `Storage upload failed for invoice ${invoice.invoiceNumber}, storing inline: ${
            uploadError instanceof Error ? uploadError.message : 'Unknown error'
          }`,
        );
        pdfUrl = `data:text/html;base64,${htmlBuffer.toString('base64')}`;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { pdfUrl },
        });
      });

      this.logger.log(
        `Invoice PDF generated for ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate invoice PDF for ${invoiceId}: ${message}`,
      );
      throw error;
    }
  }

  private generateInvoiceHtml(invoice: {
    invoiceNumber: string;
    subtotal: unknown;
    taxAmount: unknown;
    discountAmount: unknown;
    total: unknown;
    amountPaid: unknown;
    currency: string;
    status: string;
    dueDate: Date | null;
    createdAt: Date;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: unknown;
      taxAmount: unknown;
      total: unknown;
    }>;
    booking: {
      startTime: Date;
      endTime: Date;
      service: { name: string };
      client: { name: string; email: string; phone: string | null };
    };
    tenant: {
      name: string;
      slug: string;
      logoUrl: string | null;
      brandColor: string | null;
    };
  }): string {
    const brandColor = sanitizeColor(invoice.tenant.brandColor);
    const formatCurrency = (amount: unknown): string => {
      const num = typeof amount === 'object' && amount !== null
        ? Number(amount)
        : Number(amount);
      return `${invoice.currency} ${num.toFixed(2)}`;
    };

    const lineItemsHtml = invoice.lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .brand { font-size: 24px; font-weight: bold; color: ${brandColor}; }
    .invoice-meta { text-align: right; }
    .section { margin-bottom: 24px; }
    .label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: ${brandColor}; color: white; padding: 10px 8px; text-align: left; }
    .totals { margin-top: 20px; text-align: right; }
    .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 4px 0; }
    .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid ${brandColor}; padding-top: 8px; margin-top: 8px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-draft { background: #e5e7eb; color: #374151; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${invoice.tenant.name}</div>
    </div>
    <div class="invoice-meta">
      <div style="font-size: 28px; font-weight: bold;">INVOICE</div>
      <div>${invoice.invoiceNumber}</div>
      <div class="status status-${invoice.status.toLowerCase()}">${invoice.status}</div>
    </div>
  </div>

  <div style="display: flex; gap: 40px; margin-bottom: 32px;">
    <div class="section" style="flex: 1;">
      <div class="label">Bill To</div>
      <div style="font-weight: 600;">${invoice.booking.client.name}</div>
      <div>${invoice.booking.client.email}</div>
      ${invoice.booking.client.phone ? `<div>${invoice.booking.client.phone}</div>` : ''}
    </div>
    <div class="section" style="flex: 1;">
      <div class="label">Invoice Date</div>
      <div>${invoice.createdAt.toISOString().split('T')[0]}</div>
      ${invoice.dueDate ? `<div class="label" style="margin-top: 8px;">Due Date</div><div>${invoice.dueDate.toISOString().split('T')[0]}</div>` : ''}
    </div>
    <div class="section" style="flex: 1;">
      <div class="label">Service</div>
      <div>${invoice.booking.service.name}</div>
      <div class="label" style="margin-top: 8px;">Appointment</div>
      <div>${invoice.booking.startTime.toISOString().split('T')[0]}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(invoice.subtotal)}</span></div>
    <div class="total-row"><span>Tax:</span><span>${formatCurrency(invoice.taxAmount)}</span></div>
    <div class="total-row"><span>Discount:</span><span>-${formatCurrency(invoice.discountAmount)}</span></div>
    <div class="total-row grand-total"><span>Total:</span><span>${formatCurrency(invoice.total)}</span></div>
    <div class="total-row"><span>Amount Paid:</span><span>${formatCurrency(invoice.amountPaid)}</span></div>
  </div>
</body>
</html>`;
  }
}
