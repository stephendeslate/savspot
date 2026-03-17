import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureEntitlementGuard } from '@/common/guards/feature-entitlement.guard';
import {
  REQUIRES_TIER_KEY,
  REQUIRES_FEATURE_KEY,
} from '@/common/decorators/requires-feature.decorator';

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
    },
  };
}

function makeExecutionContext(
  tenantId: string | undefined,
  user: Record<string, unknown> | undefined = { id: 'user-1', tenantId },
) {
  const request = {
    params: tenantId ? { tenantId } : {},
    user,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('FeatureEntitlementGuard', () => {
  let guard: FeatureEntitlementGuard;
  let prisma: ReturnType<typeof makePrisma>;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = makePrisma();
    reflector = new Reflector();
    guard = new FeatureEntitlementGuard(reflector, prisma as never);
  });

  it('should allow when no tier or feature metadata is set', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const ctx = makeExecutionContext('tenant-1');
    const result = await guard.canActivate(ctx as never);
    expect(result).toBe(true);
  });

  describe('RequiresTier', () => {
    it('should allow when tenant meets tier requirement', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_TIER_KEY) return 'TEAM';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'TEAM',
      });

      const ctx = makeExecutionContext('tenant-1');
      const result = await guard.canActivate(ctx as never);
      expect(result).toBe(true);
    });

    it('should deny when tenant tier is below requirement', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_TIER_KEY) return 'TEAM';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'STARTER',
      });

      const ctx = makeExecutionContext('tenant-1');
      await expect(guard.canActivate(ctx as never)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('RequiresFeature', () => {
    it('should allow when feature is enabled', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_FEATURE_KEY) return 'teamManagement';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'TEAM',
      });

      const ctx = makeExecutionContext('tenant-1');
      const result = await guard.canActivate(ctx as never);
      expect(result).toBe(true);
    });

    it('should deny when feature is disabled (boolean false)', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_FEATURE_KEY) return 'teamManagement';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'STARTER',
      });

      const ctx = makeExecutionContext('tenant-1');
      await expect(guard.canActivate(ctx as never)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow smsAllocation for STARTER tier (non-zero)', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_FEATURE_KEY) return 'smsAllocation';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'STARTER',
      });

      const ctx = makeExecutionContext('tenant-1');
      const result = await guard.canActivate(ctx as never);
      expect(result).toBe(true);
    });

    it('should allow smsAllocation for PRO tier', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_FEATURE_KEY) return 'smsAllocation';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'TEAM',
      });

      const ctx = makeExecutionContext('tenant-1');
      const result = await guard.canActivate(ctx as never);
      expect(result).toBe(true);
    });

    it('should allow multiLocation for PRO tier', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_FEATURE_KEY) return 'multiLocation';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue({
        subscriptionTier: 'TEAM',
      });

      const ctx = makeExecutionContext('tenant-1');
      const result = await guard.canActivate(ctx as never);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should throw when no tenant context', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_TIER_KEY) return 'TEAM';
          return undefined;
        }) as never,
      );

      const ctx = makeExecutionContext(undefined, { id: 'user-1' });
      await expect(guard.canActivate(ctx as never)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw when tenant not found', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        ((key: string) => {
          if (key === REQUIRES_TIER_KEY) return 'TEAM';
          return undefined;
        }) as never,
      );

      prisma.tenant.findUnique.mockResolvedValue(null);

      const ctx = makeExecutionContext('tenant-nonexistent');
      await expect(guard.canActivate(ctx as never)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
