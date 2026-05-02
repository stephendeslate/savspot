import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountDeletionHandler } from '@/jobs/account-deletion.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const REQUEST_ID = 'req-001';

function makePrisma() {
  return {
    dataRequest: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
}

function makeDeletionRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    userId: USER_ID,
    requestType: 'DELETION',
    status: 'PENDING',
    deadlineAt: new Date('2026-02-01T00:00:00Z'), // past deadline
    user: { id: USER_ID, email: 'test@example.com', name: 'Test User' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AccountDeletionHandler', () => {
  let handler: AccountDeletionHandler;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    handler = new AccountDeletionHandler(prisma as never);
  });

  it('should skip when no pending deletion requests exist', async () => {
    prisma.dataRequest.findMany.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should process deletion requests past grace period with per-tenant RLS', async () => {
    const request = makeDeletionRequest();
    prisma.dataRequest.findMany.mockResolvedValue([request]);

    // First $queryRaw returns tenant IDs for the user
    prisma.$queryRaw.mockResolvedValue([{ tenant_id: 'tenant-001' }]);

    const mockTenantTx = {
      $executeRaw: vi.fn(),
      browserPushSubscription: { deleteMany: vi.fn() },
      notification: { deleteMany: vi.fn() },
      booking: { updateMany: vi.fn() },
    };
    const mockGlobalTx = {
      user: { update: vi.fn() },
      consentRecord: { deleteMany: vi.fn() },
      onboardingTour: { deleteMany: vi.fn() },
      notification: { deleteMany: vi.fn() },
      dataRequest: { update: vi.fn() },
    };

    let txCallCount = 0;
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        txCallCount++;
        // First transaction: per-tenant cleanup; Second: global cleanup
        return fn(txCallCount === 1 ? mockTenantTx : mockGlobalTx);
      },
    );

    await handler.handle();

    // One per-tenant transaction + one global transaction
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);

    // Verify tenant-scoped set_config was called
    expect(mockTenantTx.$executeRaw).toHaveBeenCalledTimes(1);

    // Verify tenant-scoped cleanup
    expect(mockTenantTx.browserPushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, tenantId: 'tenant-001' },
    });
    expect(mockTenantTx.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, tenantId: 'tenant-001' },
    });
    expect(mockTenantTx.booking.updateMany).toHaveBeenCalledWith({
      where: { clientId: USER_ID, tenantId: 'tenant-001' },
      data: { notes: null, guestDetails: 'DbNull' },
    });

    // Verify global (non-tenant) cleanup
    expect(mockGlobalTx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: expect.objectContaining({
        email: expect.stringContaining('deleted-'),
        name: '[deleted]',
        phone: null,
        avatarUrl: null,
        passwordHash: null,
        emailVerified: false,
      }),
    });
    expect(mockGlobalTx.consentRecord.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockGlobalTx.onboardingTour.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockGlobalTx.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, tenantId: null },
    });

    // Verify request marked completed
    expect(mockGlobalTx.dataRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      }),
    });
  });

  it('should continue processing other requests when one fails', async () => {
    const request1 = makeDeletionRequest({ id: 'req-fail', userId: 'user-fail' });
    const request2 = makeDeletionRequest({ id: 'req-ok', userId: 'user-ok' });
    prisma.dataRequest.findMany.mockResolvedValue([request1, request2]);

    let queryRawCallCount = 0;
    prisma.$queryRaw.mockImplementation(async () => {
      queryRawCallCount++;
      if (queryRawCallCount === 1) throw new Error('Query failed');
      return []; // No tenants for second user
    });

    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          $executeRaw: vi.fn(),
          user: { update: vi.fn() },
          consentRecord: { deleteMany: vi.fn() },
          onboardingTour: { deleteMany: vi.fn() },
          notification: { deleteMany: vi.fn() },
          dataRequest: { update: vi.fn() },
        });
      },
    );

    // Should not throw despite first request failing
    await handler.handle();

    // Only the second user's global transaction runs (no tenant-scoped ones since no tenants)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should query only PENDING deletions past deadline', async () => {
    prisma.dataRequest.findMany.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.dataRequest.findMany).toHaveBeenCalledWith({
      where: {
        requestType: 'DELETION',
        status: 'PENDING',
        deadlineAt: { lte: expect.any(Date) },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  });
});
