import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_DEMO_KEY } from '../decorators/allow-demo.decorator';
import { DEMO_TENANT_ID } from '@savspot/shared';

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class DemoTenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public routes (booking endpoints, health, etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip routes explicitly marked as demo-safe
    const allowDemo = this.reflector.getAllAndOverride<boolean>(ALLOW_DEMO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowDemo) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Allow read-only methods
    if (SAFE_METHODS.has(request.method)) return true;

    // Determine tenant ID from user or route params
    const user = request.user as AuthenticatedUser | undefined;
    const params = request.params as Record<string, string> | undefined;
    const tenantId =
      params?.['tenantId'] ?? params?.['id'] ?? user?.tenantId;

    if (tenantId !== DEMO_TENANT_ID) return true;

    throw new ForbiddenException(
      'This is a demo account. Sign up for free to create your own booking page.',
    );
  }
}
