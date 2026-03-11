import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionsService } from '@/auth/permissions/permissions.service';
import {
  FULL_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
} from '@/auth/permissions/permissions.constants';

function makePrisma() {
  return {
    tenantMembership: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PermissionsService(prisma as never);
  });

  describe('getEffectivePermissions', () => {
    it('should return full permissions for OWNER role', () => {
      const result = service.getEffectivePermissions({
        role: 'OWNER',
        permissions: null,
      });
      expect(result).toEqual(FULL_PERMISSIONS);
    });

    it('should return full permissions for ADMIN role', () => {
      const result = service.getEffectivePermissions({
        role: 'ADMIN',
        permissions: null,
      });
      expect(result).toEqual(FULL_PERMISSIONS);
    });

    it('should return staff defaults for STAFF role', () => {
      const result = service.getEffectivePermissions({
        role: 'STAFF',
        permissions: null,
      });
      expect(result).toEqual(STAFF_DEFAULT_PERMISSIONS);
    });

    it('should narrow permissions with overrides', () => {
      const result = service.getEffectivePermissions({
        role: 'ADMIN',
        permissions: {
          payments: { refund: false },
          team: { manage: false },
        },
      });
      expect(result.payments.refund).toBe(false);
      expect(result.team.manage).toBe(false);
      expect(result.bookings.view).toBe(true);
    });

    it('should not expand permissions with overrides', () => {
      const result = service.getEffectivePermissions({
        role: 'STAFF',
        permissions: {
          bookings: { cancel: true },
          reports: { view: true },
        },
      });
      // Cannot expand: cancel was false in STAFF defaults, stays false
      expect(result.bookings.cancel).toBe(false);
      expect(result.reports.view).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for allowed permission', () => {
      const result = service.hasPermission(
        { role: 'OWNER', permissions: null },
        'bookings',
        'cancel',
      );
      expect(result).toBe(true);
    });

    it('should return false for denied permission', () => {
      const result = service.hasPermission(
        { role: 'STAFF', permissions: null },
        'bookings',
        'cancel',
      );
      expect(result).toBe(false);
    });

    it('should respect overrides that narrow access', () => {
      const result = service.hasPermission(
        {
          role: 'ADMIN',
          permissions: { bookings: { cancel: false } },
        },
        'bookings',
        'cancel',
      );
      expect(result).toBe(false);
    });
  });

  describe('getEffectivePermissionsForMember', () => {
    it('should fetch membership and return effective permissions', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue({
        role: 'STAFF',
        permissions: null,
      });

      const result = await service.getEffectivePermissionsForMember(
        'tenant-1',
        'user-1',
      );
      expect(result).toEqual(STAFF_DEFAULT_PERMISSIONS);
    });

    it('should throw NotFoundException if membership not found', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.getEffectivePermissionsForMember('tenant-1', 'user-1'),
      ).rejects.toThrow('Team member not found');
    });
  });

  describe('updatePermissions', () => {
    it('should validate and save narrowing overrides', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue({
        role: 'ADMIN',
        permissions: null,
      });
      prisma.tenantMembership.update.mockResolvedValue({});

      const overrides = { payments: { refund: false } };
      const result = await service.updatePermissions(
        'tenant-1',
        'user-1',
        overrides,
      );
      expect(result.payments.refund).toBe(false);
      expect(prisma.tenantMembership.update).toHaveBeenCalled();
    });

    it('should reject overrides that expand permissions', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue({
        role: 'STAFF',
        permissions: null,
      });

      const overrides = { bookings: { cancel: true } };
      await expect(
        service.updatePermissions('tenant-1', 'user-1', overrides),
      ).rejects.toThrow('Cannot expand permissions beyond role defaults');
    });

    it('should reject unknown resource', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue({
        role: 'ADMIN',
        permissions: null,
      });

      const overrides = { unknown: { action: false } } as never;
      await expect(
        service.updatePermissions('tenant-1', 'user-1', overrides),
      ).rejects.toThrow('Unknown permission resource');
    });

    it('should reject unknown action', async () => {
      prisma.tenantMembership.findUnique.mockResolvedValue({
        role: 'ADMIN',
        permissions: null,
      });

      const overrides = { bookings: { unknown: false } } as never;
      await expect(
        service.updatePermissions('tenant-1', 'user-1', overrides),
      ).rejects.toThrow('Unknown permission action');
    });
  });
});
