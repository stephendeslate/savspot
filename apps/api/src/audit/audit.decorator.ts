import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Decorator for explicit audit logging on specific handlers.
 * The audit interceptor checks for this metadata and uses the custom action if present.
 */
export const AuditLog = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
