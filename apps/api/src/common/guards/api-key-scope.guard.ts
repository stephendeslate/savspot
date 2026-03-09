import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_SCOPES_KEY } from '../decorators/api-key-scopes.decorator';

/**
 * Guard that enforces API key scope restrictions.
 * When an endpoint is decorated with @RequiredApiKeyScopes('scope1', 'scope2'),
 * API key users must have ALL listed scopes. JWT-authenticated users bypass this
 * check entirely. Endpoints without scope annotations pass through.
 */
@Injectable()
export class ApiKeyScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[] | undefined>(
      API_KEY_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No scope restriction on this endpoint
    if (!requiredScopes || requiredScopes.length === 0) return true;

    const request = context.switchToHttp().getRequest();

    // JWT auth (not API key) — scopes don't apply
    if (!request.user?.isApiKey) return true;

    const userScopes: string[] = request.user.apiKeyScopes ?? [];
    return requiredScopes.every((scope) => userScopes.includes(scope));
  }
}
