import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantRolesGuard } from '@/common/guards/tenant-roles.guard';
import { TenantStatusGuard } from '@/common/guards/tenant-status.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

function makeReflector() {
  return {
    getAllAndOverride: vi.fn(),
  };
}

function makePrisma() {
  return {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    tenantMembership: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  };
}

function makeExecutionContext(user: unknown, params: Record<string, string> = {}) {
  const request = { user, params };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

// ---------------------------------------------------------------------------
// TenantRolesGuard
// ---------------------------------------------------------------------------
describe('TenantRolesGuard', () => {
  let guard: TenantRolesGuard;
  let reflector: ReturnType<typeof makeReflector>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    reflector = makeReflector();
    prisma = makePrisma();
    guard = new TenantRolesGuard(reflector as never, prisma as never);
  });

  it('should allow access when no @TenantRoles decorator is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = makeExecutionContext({ id: USER_ID });
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should allow access when decorator has empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const ctx = makeExecutionContext({ id: USER_ID });
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when no user on request', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);

    const ctx = makeExecutionContext(undefined);

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw ForbiddenException when no tenant context is available', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);

    const ctx = makeExecutionContext({ id: USER_ID });

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user is not a member', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
    });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      'Not a member of this tenant',
    );
  });

  it('should throw ForbiddenException when user lacks required role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ role: 'STAFF' }),
        },
      });
    });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      'Insufficient tenant permissions',
    );
  });

  it('should allow access and set tenant context when user has required role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER', 'ADMIN']);
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ role: 'ADMIN' }),
        },
      });
    });

    const user = { id: USER_ID } as Record<string, unknown>;
    const ctx = makeExecutionContext(user, { tenantId: TENANT_ID });
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
    expect(user['tenantId']).toBe(TENANT_ID);
    expect(user['tenantRole']).toBe('ADMIN');
  });

  it('should resolve tenantId from route param :id when :tenantId is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({ role: 'OWNER' }),
        },
      });
    });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { id: TENANT_ID },
    );
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TenantStatusGuard
// ---------------------------------------------------------------------------
describe('TenantStatusGuard', () => {
  let guard: TenantStatusGuard;
  let reflector: ReturnType<typeof makeReflector>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    reflector = makeReflector();
    prisma = makePrisma();
    guard = new TenantStatusGuard(reflector as never, prisma as never);
  });

  it('should allow access for public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const ctx = makeExecutionContext({ id: USER_ID });
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('should allow access when no user is on the request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = makeExecutionContext(undefined);
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should allow access when no tenant context is available', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = makeExecutionContext({ id: USER_ID });
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should allow access when tenant is not found in DB', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue(null);

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should allow access when tenant status is ACTIVE', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue({ status: 'ACTIVE' });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );
    const result = await guard.canActivate(ctx as never);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when tenant is suspended', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue({ status: 'SUSPENDED' });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      'Tenant account is suspended',
    );
  });

  it('should throw ForbiddenException when tenant is DEACTIVATED', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue({ status: 'DEACTIVATED' });

    const ctx = makeExecutionContext(
      { id: USER_ID },
      { tenantId: TENANT_ID },
    );

    await expect(guard.canActivate(ctx as never)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
