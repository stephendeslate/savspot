import { describe, it, expect, vi } from 'vitest';
import {
  TENANT_SCOPED_MODELS,
  withTenantExtension,
} from '@/prisma/prisma-tenant.extension';

// ---------------------------------------------------------------------------
// TENANT_SCOPED_MODELS
// ---------------------------------------------------------------------------
describe('TENANT_SCOPED_MODELS', () => {
  it('should be a ReadonlySet', () => {
    expect(TENANT_SCOPED_MODELS).toBeInstanceOf(Set);
  });

  it('should include core tenant-scoped models', () => {
    expect(TENANT_SCOPED_MODELS.has('Booking')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('Payment')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('Service')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('TenantMembership')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('Invoice')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('AuditLog')).toBe(true);
  });

  it('should NOT include non-tenant models', () => {
    expect(TENANT_SCOPED_MODELS.has('User')).toBe(false);
    expect(TENANT_SCOPED_MODELS.has('Tenant')).toBe(false);
    expect(TENANT_SCOPED_MODELS.has('Subscription')).toBe(false);
  });

  it('should contain expected number of models', () => {
    // Verify it has a reasonable number of entries
    expect(TENANT_SCOPED_MODELS.size).toBeGreaterThanOrEqual(40);
  });
});

// ---------------------------------------------------------------------------
// withTenantExtension
// ---------------------------------------------------------------------------
describe('withTenantExtension', () => {
  const TENANT_ID = 'tenant-001';

  function makeMockPrisma() {
    let capturedHandler: (params: {
      model: string | undefined;
      operation: string;
      args: Record<string, unknown>;
      query: (args: Record<string, unknown>) => Promise<unknown>;
    }) => Promise<unknown>;

    const prisma = {
      $extends: vi.fn().mockImplementation((config) => {
        capturedHandler =
          config.query.$allModels.$allOperations;
        return prisma;
      }),
    };

    return {
      prisma,
      getHandler: () => capturedHandler,
    };
  }

  it('should call $extends on the prisma client', () => {
    const { prisma } = makeMockPrisma();

    withTenantExtension(prisma as never, TENANT_ID);

    expect(prisma.$extends).toHaveBeenCalledOnce();
  });

  it('should pass through for non-tenant-scoped models', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue([]);
    const args = { where: { email: 'test@example.com' } };

    await handler({
      model: 'User',
      operation: 'findMany',
      args,
      query: queryFn,
    });

    // Should pass original args unmodified
    expect(queryFn).toHaveBeenCalledWith(args);
  });

  it('should inject tenantId into where clause for READ operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue([]);
    const args = { where: { status: 'ACTIVE' } };

    await handler({
      model: 'Booking',
      operation: 'findMany',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', tenantId: TENANT_ID },
    });
  });

  it('should inject tenantId into data for CREATE operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue({});
    const args = { data: { name: 'Test Service' } };

    await handler({
      model: 'Service',
      operation: 'create',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      data: { name: 'Test Service', tenantId: TENANT_ID },
    });
  });

  it('should inject tenantId into each item for createMany with array data', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue({ count: 2 });
    const args = {
      data: [{ name: 'A' }, { name: 'B' }],
    };

    await handler({
      model: 'Service',
      operation: 'createMany',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      data: [
        { name: 'A', tenantId: TENANT_ID },
        { name: 'B', tenantId: TENANT_ID },
      ],
    });
  });

  it('should inject tenantId into where for UPDATE operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue({});
    const args = {
      where: { id: 'booking-001' },
      data: { status: 'COMPLETED' },
    };

    await handler({
      model: 'Booking',
      operation: 'update',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      where: { id: 'booking-001', tenantId: TENANT_ID },
      data: { status: 'COMPLETED' },
    });
  });

  it('should inject tenantId into where and create for UPSERT operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue({});
    const args = {
      where: { id: 'disc-001' },
      create: { code: 'SAVE10' },
      update: { code: 'SAVE20' },
    };

    await handler({
      model: 'Discount',
      operation: 'upsert',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      where: { id: 'disc-001', tenantId: TENANT_ID },
      create: { code: 'SAVE10', tenantId: TENANT_ID },
      update: { code: 'SAVE20' },
    });
  });

  it('should inject tenantId into where for DELETE operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue({});
    const args = { where: { id: 'note-001' } };

    await handler({
      model: 'Note',
      operation: 'delete',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith({
      where: { id: 'note-001', tenantId: TENANT_ID },
    });
  });

  it('should pass through for undefined model', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue([]);
    const args = {};

    await handler({
      model: undefined,
      operation: 'findMany',
      args,
      query: queryFn,
    });

    expect(queryFn).toHaveBeenCalledWith(args);
  });

  it('should pass through for unrecognised operations', async () => {
    const { prisma, getHandler } = makeMockPrisma();
    withTenantExtension(prisma as never, TENANT_ID);
    const handler = getHandler();

    const queryFn = vi.fn().mockResolvedValue(42);
    const args = { where: { id: 'booking-001' } };

    await handler({
      model: 'Booking',
      operation: 'someFutureOperation',
      args,
      query: queryFn,
    });

    // Fallback passes original args
    expect(queryFn).toHaveBeenCalledWith(args);
  });
});
