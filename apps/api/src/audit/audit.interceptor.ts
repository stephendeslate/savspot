import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditAction, ActorType } from '../../../../prisma/generated/prisma';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';

const AUDITED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SKIP_PATHS = ['/api/auth/', '/api/health', '/api/payments/webhook'];

interface RequestUser {
  sub?: string;
  id?: string;
  tenantId?: string;
  isApiKey?: boolean;
}

/**
 * Global interceptor that logs state-changing operations to the audit_logs table.
 * Runs asynchronously after the response is sent (via tap) — does not block responses.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip non-state-changing methods
    if (!AUDITED_METHODS.has(request.method)) {
      return next.handle();
    }

    // Skip exempt paths
    const path = request.path;
    if (SKIP_PATHS.some((skip) => path.startsWith(skip))) {
      return next.handle();
    }

    // Check for explicit @AuditLog decorator
    const customAction = this.reflector.get<string | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap((responseData) => {
        const user = request.user as RequestUser | undefined;
        const actorId = user?.sub ?? user?.id;
        const tenantId = user?.tenantId ?? this.extractTenantId(request);
        const actorType: ActorType = user?.isApiKey ? 'API_KEY' : actorId ? 'USER' : 'SYSTEM';

        const action = customAction
          ? (customAction as AuditAction)
          : this.mapMethodToAction(request.method);

        const entityType = this.extractEntityType(path);
        const entityId = this.extractEntityId(request, responseData);

        if (!entityId) return;

        this.auditService.log({
          tenantId,
          entityType,
          entityId,
          action,
          actorId,
          actorType,
          newValues: request.method !== 'DELETE' ? request.body : undefined,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PATCH':
      case 'PUT':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private extractEntityType(path: string): string {
    // Extract the resource name from the URL path
    // e.g., /api/tenants/:id/tax-rates → tax_rate
    // e.g., /api/bookings/:id → booking
    const segments = path.replace('/api/', '').split('/').filter(Boolean);
    // Find the last non-UUID segment
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i]!;
      if (!this.isUuid(segment)) {
        return segment.replace(/-/g, '_').replace(/s$/, '');
      }
    }
    return 'unknown';
  }

  private extractEntityId(request: Request, responseData: unknown): string | undefined {
    // For POST (create), try to get the ID from the response
    if (request.method === 'POST') {
      const data = responseData as Record<string, unknown> | undefined;
      return (data?.['id'] as string) ?? undefined;
    }

    // For PATCH/PUT/DELETE, get from route params
    const params = request.params;
    if (params['id']) return params['id'] as string;

    // Try the last UUID segment in the path
    const segments = request.path.split('/');
    for (let i = segments.length - 1; i >= 0; i--) {
      if (this.isUuid(segments[i]!)) {
        return segments[i]!;
      }
    }

    return undefined;
  }

  private extractTenantId(request: Request): string | undefined {
    return (request.params['tenantId'] as string | undefined) ?? undefined;
  }

  private isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }
}
