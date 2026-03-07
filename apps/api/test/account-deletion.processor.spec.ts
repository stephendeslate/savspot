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

function makeJob() {
  return { data: {} } as never;
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

    await handler.handle(makeJob());

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should process deletion requests past grace period', async () => {
    const request = makeDeletionRequest();
    prisma.dataRequest.findMany.mockResolvedValue([request]);

    const mockTx = {
      user: { update: vi.fn() },
      browserPushSubscription: { deleteMany: vi.fn() },
      consentRecord: { deleteMany: vi.fn() },
      onboardingTour: { deleteMany: vi.fn() },
      notification: { deleteMany: vi.fn() },
      booking: { updateMany: vi.fn() },
      dataRequest: { update: vi.fn() },
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await handler.handle(makeJob());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // Verify user anonymization
    expect(mockTx.user.update).toHaveBeenCalledWith({
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

    // Verify related data cleanup
    expect(mockTx.browserPushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockTx.consentRecord.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockTx.onboardingTour.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockTx.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });

    // Verify booking anonymization
    expect(mockTx.booking.updateMany).toHaveBeenCalledWith({
      where: { clientId: USER_ID },
      data: { notes: null, guestDetails: null },
    });

    // Verify request marked completed
    expect(mockTx.dataRequest.update).toHaveBeenCalledWith({
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

    let callCount = 0;
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        callCount++;
        if (callCount === 1) throw new Error('TX failed');
        return fn({
          user: { update: vi.fn() },
          browserPushSubscription: { deleteMany: vi.fn() },
          consentRecord: { deleteMany: vi.fn() },
          onboardingTour: { deleteMany: vi.fn() },
          notification: { deleteMany: vi.fn() },
          booking: { updateMany: vi.fn() },
          dataRequest: { update: vi.fn() },
        });
      },
    );

    // Should not throw despite first request failing
    await handler.handle(makeJob());

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('should query only PENDING deletions past deadline', async () => {
    prisma.dataRequest.findMany.mockResolvedValue([]);

    await handler.handle(makeJob());

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
