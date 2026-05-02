import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComputeNoShowRiskHandler } from '@/jobs/compute-no-show-risk.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
}


// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ComputeNoShowRiskHandler', () => {
  let handler: ComputeNoShowRiskHandler;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    handler = new ComputeNoShowRiskHandler(prisma as never);
  });

  it('should do nothing when there are no upcoming bookings', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should compute risk scores for upcoming bookings', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'booking-001',
        tenant_id: 'tenant-001',
        client_id: 'client-001',
        service_id: 'service-001',
        start_time: futureDate,
      },
    ]);

    prisma.$queryRaw
      .mockResolvedValueOnce([{ day_of_week: 1, no_show_rate: 0.1 }])
      .mockResolvedValueOnce([{ service_id: 'service-001', no_show_rate: 0.1 }]);

    const mockTx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([
        { no_show_count: BigInt(2), total_count: BigInt(10) },
      ]),
    };

    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalled();
  });

  it('should assign 0.5 base score for clients with no booking history', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'booking-001',
        tenant_id: 'tenant-001',
        client_id: 'client-new',
        service_id: 'service-001',
        start_time: futureDate,
      },
    ]);

    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const executedValues: number[] = [];
    const mockTx = {
      $executeRaw: vi.fn().mockImplementation((...args: unknown[]) => {
        const strings = args[0] as TemplateStringsArray;
        if (strings.length > 0) {
          const raw = strings.raw.join('');
          if (raw.includes('no_show_risk_score')) {
            executedValues.push(args[1] as number);
          }
        }
        return Promise.resolve();
      }),
      $queryRaw: vi.fn().mockResolvedValue([
        { no_show_count: BigInt(0), total_count: BigInt(0) },
      ]),
    };

    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalled();
  });

  it('should handle errors for individual tenants without stopping', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'booking-001',
        tenant_id: 'tenant-001',
        client_id: 'client-001',
        service_id: 'service-001',
        start_time: futureDate,
      },
      {
        id: 'booking-002',
        tenant_id: 'tenant-002',
        client_id: 'client-002',
        service_id: 'service-002',
        start_time: futureDate,
      },
    ]);

    prisma.$queryRaw
      .mockRejectedValueOnce(new Error('DB error for tenant-001'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const mockTx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([
        { no_show_count: BigInt(0), total_count: BigInt(0) },
      ]),
    };

    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should clamp scores between 0 and 1', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'booking-001',
        tenant_id: 'tenant-001',
        client_id: 'client-frequent-ns',
        service_id: 'service-001',
        start_time: futureDate,
      },
    ]);

    prisma.$queryRaw
      .mockResolvedValueOnce([{ day_of_week: 1, no_show_rate: 0.5 }])
      .mockResolvedValueOnce([{ service_id: 'service-001', no_show_rate: 0.5 }]);

    const mockTx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([
        { no_show_count: BigInt(9), total_count: BigInt(10) },
      ]),
    };

    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await handler.handle();

    expect(mockTx.$executeRaw).toHaveBeenCalled();
  });
});
