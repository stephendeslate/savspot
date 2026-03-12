import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { TenantContextService } from '@/tenant-context/tenant-context.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClsService() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => store.set(key, value)),
    _store: store,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TenantContextService', () => {
  let service: TenantContextService;
  let cls: ReturnType<typeof makeClsService>;

  beforeEach(() => {
    cls = makeClsService();
    service = new TenantContextService(cls as never);
  });

  describe('setCurrentTenantId', () => {
    it('should store tenantId in CLS', () => {
      service.setCurrentTenantId('tenant-001');

      expect(cls.set).toHaveBeenCalledWith('tenantId', 'tenant-001');
    });
  });

  describe('getCurrentTenantId', () => {
    it('should return tenantId from CLS', () => {
      service.setCurrentTenantId('tenant-001');

      const result = service.getCurrentTenantId();

      expect(result).toBe('tenant-001');
    });

    it('should return undefined when no tenant context is set', () => {
      const result = service.getCurrentTenantId();

      expect(result).toBeUndefined();
    });
  });

  describe('requireCurrentTenantId', () => {
    it('should return tenantId when set', () => {
      service.setCurrentTenantId('tenant-001');

      const result = service.requireCurrentTenantId();

      expect(result).toBe('tenant-001');
    });

    it('should throw UnauthorizedException when not set', () => {
      expect(() => service.requireCurrentTenantId()).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw with descriptive message', () => {
      expect(() => service.requireCurrentTenantId()).toThrow(
        'Tenant context is required',
      );
    });
  });
});
