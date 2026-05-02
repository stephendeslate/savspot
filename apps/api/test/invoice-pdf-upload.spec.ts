import { describe, it, expect, vi } from 'vitest';
import { InvoicePdfService } from '../src/jobs/invoice-pdf.service';
import { GenerateInvoicePdfProcessor } from '../src/jobs/generate-invoice-pdf.processor';
import { JOB_GENERATE_INVOICE_PDF } from '../src/bullmq/queue.constants';

function makePrisma() {
  const prisma = {
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma));
  return prisma;
}

function makeUploadService(shouldFail = false) {
  return {
    getPresignedUploadUrl: shouldFail
      ? vi.fn().mockRejectedValue(new Error('R2 not configured'))
      : vi.fn().mockResolvedValue({
          uploadUrl: 'https://r2.example.com/presigned-put',
          publicUrl: 'https://cdn.savspot.co/tenants/t1/invoice-INV001.html',
          key: 'tenants/t1/invoice-INV001.html',
        }),
  };
}

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  subtotal: 100,
  taxAmount: 10,
  discountAmount: 0,
  total: 110,
  amountPaid: 110,
  currency: 'USD',
  status: 'PAID',
  dueDate: new Date('2026-04-01'),
  createdAt: new Date('2026-03-01'),
  lineItems: [
    {
      description: 'Haircut',
      quantity: 1,
      unitPrice: 100,
      taxAmount: 10,
      total: 110,
    },
  ],
  booking: {
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    service: { name: 'Haircut' },
    client: { name: 'Jane Doe', email: 'jane@test.com', phone: null },
  },
  tenant: {
    name: 'Test Salon',
    slug: 'test-salon',
    logoUrl: null,
    brandColor: '#ff0000',
  },
};

describe('InvoicePdfService — generate + upload (S8)', () => {
  it('uploads invoice HTML to storage and stores public URL', async () => {
    const prisma = makePrisma();
    const uploadService = makeUploadService();
    const service = new InvoicePdfService(prisma as never, uploadService as never);

    prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    prisma.invoice.update.mockResolvedValue({});

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as never;

    try {
      await service.generateAndUpload({ tenantId: 'tenant-1', invoiceId: 'inv-1' });

      expect(uploadService.getPresignedUploadUrl).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        fileName: 'invoice-INV-001.html',
        contentType: 'text/html',
      });

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          pdfUrl: 'https://cdn.savspot.co/tenants/t1/invoice-INV001.html',
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to data URI when storage upload fails', async () => {
    const prisma = makePrisma();
    const uploadService = makeUploadService(true);
    const service = new InvoicePdfService(prisma as never, uploadService as never);

    prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    prisma.invoice.update.mockResolvedValue({});

    await service.generateAndUpload({ tenantId: 'tenant-1', invoiceId: 'inv-1' });

    const updateCall = prisma.invoice.update.mock.calls[0]![0] as {
      data: { pdfUrl: string };
    };
    expect(updateCall.data.pdfUrl).toMatch(/^data:text\/html;base64,/);
  });

  it('skips processing when invoice not found', async () => {
    const prisma = makePrisma();
    const uploadService = makeUploadService();
    const service = new InvoicePdfService(prisma as never, uploadService as never);

    prisma.invoice.findFirst.mockResolvedValue(null);

    await service.generateAndUpload({ tenantId: 'tenant-1', invoiceId: 'inv-1' });

    expect(uploadService.getPresignedUploadUrl).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});

describe('GenerateInvoicePdfProcessor — BullMQ adapter', () => {
  it('skips processing for non-matching job names', async () => {
    const service = { generateAndUpload: vi.fn() };
    const processor = new GenerateInvoicePdfProcessor(service as never);

    await processor.process({
      name: 'someOtherJob',
      data: { tenantId: 'tenant-1', invoiceId: 'inv-1' },
    } as never);

    expect(service.generateAndUpload).not.toHaveBeenCalled();
  });

  it('delegates job.data to InvoicePdfService for matching job name', async () => {
    const service = { generateAndUpload: vi.fn().mockResolvedValue(undefined) };
    const processor = new GenerateInvoicePdfProcessor(service as never);

    const data = { tenantId: 'tenant-1', invoiceId: 'inv-1' };
    await processor.process({ name: JOB_GENERATE_INVOICE_PDF, data } as never);

    expect(service.generateAndUpload).toHaveBeenCalledWith(data);
  });
});
