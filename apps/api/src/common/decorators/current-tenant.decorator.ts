import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Parameter decorator that extracts the current tenant ID from the request.
 * The tenant ID is set by the JWT strategy in the user payload.
 *
 * Usage:
 *   @Get('services')
 *   getServices(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as { tenantId?: string } | undefined;
    return user?.tenantId;
  },
);
