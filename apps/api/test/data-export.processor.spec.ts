import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataExportHandler } from '@/jobs/data-export.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const REQUEST_ID = 'req-001';

function makePrisma() {
  return {
    dataRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    consentRecord: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
    supportTicket: { findMany: vi.fn() },
  };
}

function makeUploadService() {
  return {
    getPresignedUploadUrl: vi.fn(),
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return { dataRequestId: REQUEST_ID, userId: USER_ID, ...overrides } as never;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DataExportHandler', () => {
  let handler: DataExportHandler;
  let prisma: ReturnType<typeof makePrisma>;
  let uploadService: ReturnType<typeof makeUploadService>;

  beforeEach(() => {
    prisma = makePrisma();
    uploadService = makeUploadService();
    handler = new DataExportHandler(prisma as never, uploadService as never);

    // Default happy-path mocks for gatherUserData
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: 'test@example.com',
      name: 'Test User',
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.consentRecord.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.supportTicket.findMany.mockResolvedValue([]);
  });

  it('should skip if data request is not found', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue(null);

    await handler.handle(makePayload());

    expect(prisma.dataRequest.update).not.toHaveBeenCalled();
  });

  it('should skip if data request is not PENDING', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue({
      id: REQUEST_ID,
      status: 'COMPLETED',
    });

    await handler.handle(makePayload());

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should gather user data and mark request completed', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue({
      id: REQUEST_ID,
      status: 'PENDING',
    });

    // Mock upload failure to test inline fallback
    uploadService.getPresignedUploadUrl.mockRejectedValue(
      new Error('R2 not configured'),
    );
    prisma.dataRequest.update.mockResolvedValue({});

    await handler.handle(makePayload());

    // Should have gathered user data
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: expect.objectContaining({ id: true, email: true }),
    });

    // Should mark as completed with inline fallback
    expect(prisma.dataRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        exportUrl: 'export-stored-inline',
      }),
    });
  });

  it('should upload to R2 when available', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue({
      id: REQUEST_ID,
      status: 'PENDING',
    });

    uploadService.getPresignedUploadUrl.mockResolvedValue({
      uploadUrl: 'https://r2.example.com/upload',
      publicUrl: 'https://cdn.example.com/export.json',
    });

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    prisma.dataRequest.update.mockResolvedValue({});

    await handler.handle(makePayload());

    expect(mockFetch).toHaveBeenCalledWith(
      'https://r2.example.com/upload',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(prisma.dataRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: expect.objectContaining({
        exportUrl: 'https://cdn.example.com/export.json',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should mark request with error notes on failure and re-throw', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue({
      id: REQUEST_ID,
      status: 'PENDING',
    });
    prisma.user.findUnique.mockRejectedValue(new Error('DB connection lost'));
    prisma.dataRequest.update.mockResolvedValue({});

    await expect(handler.handle(makePayload())).rejects.toThrow('DB connection lost');

    expect(prisma.dataRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: { notes: expect.stringContaining('DB connection lost') },
    });
  });
});
