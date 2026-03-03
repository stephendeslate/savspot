import { SetMetadata } from '@nestjs/common';

/**
 * Tenant roles from the Prisma TenantRole enum.
 * Duplicated as string literals to avoid ESM/CJS import issues.
 */
export type TenantRoleType = 'OWNER' | 'ADMIN' | 'STAFF';

export const TENANT_ROLES_KEY = 'tenantRoles';

/**
 * Decorator to restrict access to specific tenant roles.
 *
 * Usage:
 *   @TenantRoles('OWNER', 'ADMIN')
 *   @Patch('settings')
 *   updateSettings() { ... }
 */
export const TenantRoles = (...roles: TenantRoleType[]) =>
  SetMetadata(TENANT_ROLES_KEY, roles);
