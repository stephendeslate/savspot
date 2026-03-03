import { z } from 'zod';

export const PlatformRole = z.enum(['PLATFORM_ADMIN', 'USER']);
export type PlatformRole = z.infer<typeof PlatformRole>;

export const TenantRole = z.enum(['OWNER', 'ADMIN', 'STAFF']);
export type TenantRole = z.infer<typeof TenantRole>;

export const InvitationStatus = z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export type InvitationStatus = z.infer<typeof InvitationStatus>;
