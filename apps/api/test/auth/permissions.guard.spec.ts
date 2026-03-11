import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PermissionsService } from '@/auth/permissions/permissions.service';

function makeReflector() {
  return {
    getAllAndOverride: vi.fn(),
  };
}

function makePrisma() {
  return {
    $transaction: vi.fn(),
  };
}

function makePermissionsService() {
  return {
    hasPermission: vi.fn(),
  };
}

function makeExecutionContext(overrides: {
  user?: Record<string, unknown>;
  params?: Record<string, string>;
}): ExecutionContext {
  const request = {
    user: overrides.user ?? { sub: 'user-1', id: 'user-1' },
    params: overrides.params ?? { tenantId: 'tenant-1' },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: ReturnType<typeof makeReflector>;
  let permissionsService: ReturnType<typeof makePermissionsService>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    reflector = makeReflector();
    permissionsService = makePermissionsService();
    prisma = makePrisma();
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
      prisma as never,
    );
  });

  it('should allow when no permission decorator is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeExecutionContext({});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow when user has required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: 'bookings',
      action: 'cancel',
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({
            role: 'ADMIN',
            permissions: null,
          }),
        },
      });
    });
    permissionsService.hasPermission.mockReturnValue(true);

    const ctx = makeExecutionContext({
      user: { sub: 'user-1', id: 'user-1' },
      params: { tenantId: 'tenant-1' },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should deny when user lacks required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: 'bookings',
      action: 'cancel',
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue({
            role: 'STAFF',
            permissions: null,
          }),
        },
      });
    });
    permissionsService.hasPermission.mockReturnValue(false);

    const ctx = makeExecutionContext({
      user: { sub: 'user-1', id: 'user-1' },
      params: { tenantId: 'tenant-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when user is not a member of the tenant', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: 'bookings',
      action: 'view',
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        $executeRaw: vi.fn(),
        tenantMembership: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
    });

    const ctx = makeExecutionContext({
      user: { sub: 'user-1', id: 'user-1' },
      params: { tenantId: 'tenant-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Not a member of this tenant',
    );
  });

  it('should deny when no tenant context', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: 'bookings',
      action: 'view',
    });

    const ctx = makeExecutionContext({
      user: { sub: 'user-1', id: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Tenant context required',
    );
  });
});
