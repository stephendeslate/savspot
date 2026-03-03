import { SetMetadata } from '@nestjs/common';

/**
 * Platform roles from the Prisma PlatformRole enum.
 * Duplicated as string literals to avoid ESM/CJS import issues.
 */
export type PlatformRoleType = 'PLATFORM_ADMIN' | 'USER';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict access to specific platform roles.
 *
 * Usage:
 *   @Roles('PLATFORM_ADMIN')
 *   @Get('admin/users')
 *   listAllUsers() { ... }
 */
export const Roles = (...roles: PlatformRoleType[]) =>
  SetMetadata(ROLES_KEY, roles);
