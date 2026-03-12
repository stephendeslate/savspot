import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PublicBookingService } from '@/public-booking/public-booking.service';

// ---------------------------------------------------------------------------
// Mock qrcode module
// ---------------------------------------------------------------------------

const mockToBuffer = vi.fn();

vi.mock('qrcode', () => ({
  default: { toBuffer: mockToBuffer },
  toBuffer: mockToBuffer,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLUG = 'acme-salon';
const TENANT_ID = 'tenant-001';
const WEB_URL = 'https://app.savspot.com';

function makePrisma() {
  return {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(0),
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'WEB_URL') return WEB_URL;
      return undefined;
    }),
  };
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PublicBookingService – generateQrCode', () => {
  let service: PublicBookingService;
  let prisma: ReturnType<typeof makePrisma>;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    config = makeConfig();
    service = new PublicBookingService(prisma as never, config as never, makeRedis() as never);
  });

  it('should throw NotFoundException when tenant is not found', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(service.generateQrCode('no-exist')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when tenant is not ACTIVE', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      status: 'SUSPENDED',
    });

    await expect(service.generateQrCode(SLUG)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should construct the correct booking URL from WEB_URL config and slug', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      status: 'ACTIVE',
    });
    const fakeBuffer = Buffer.from('png-data');
    mockToBuffer.mockResolvedValue(fakeBuffer);

    await service.generateQrCode(SLUG);

    expect(config.get).toHaveBeenCalledWith('WEB_URL', 'http://localhost:3000');
    expect(mockToBuffer).toHaveBeenCalledWith(
      `${WEB_URL}/book/${SLUG}`,
      expect.objectContaining({ width: 300 }),
    );
  });

  it('should call QRCode.toBuffer with correct options', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      status: 'ACTIVE',
    });
    const fakeBuffer = Buffer.from('png-data');
    mockToBuffer.mockResolvedValue(fakeBuffer);

    await service.generateQrCode(SLUG);

    expect(mockToBuffer).toHaveBeenCalledWith(
      expect.any(String),
      {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      },
    );
  });

  it('should return the buffer from QRCode.toBuffer', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      status: 'ACTIVE',
    });
    const fakeBuffer = Buffer.from('png-data');
    mockToBuffer.mockResolvedValue(fakeBuffer);

    const result = await service.generateQrCode(SLUG);

    expect(result).toBe(fakeBuffer);
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
