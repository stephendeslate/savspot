import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyService } from '../../auth/api-key.service';

const API_KEY_HEADER = 'x-api-key';

/**
 * Global JWT authentication guard with API key fallback.
 *
 * Authentication order:
 *   1. Skip entirely for routes decorated with @Public().
 *   2. If an X-API-Key header is present, authenticate via ApiKeyService.
 *   3. Otherwise, authenticate via JWT (Passport).
 *
 * API key auth takes priority when the header is present so that
 * machine-to-machine callers don't need to send a Bearer token.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private apiKeyService?: ApiKeyService;

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = request.headers[API_KEY_HEADER] as string | undefined;

    // If X-API-Key header is present, try API key auth first
    if (apiKeyHeader) {
      return this.authenticateWithApiKey(request, apiKeyHeader);
    }

    // Fall back to JWT authentication
    return super.canActivate(context) as Promise<boolean>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override handleRequest<TUser>(err: Error | null, user: TUser | false, info: unknown): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }

  /**
   * Authenticate the request using an API key.
   * Lazily resolves ApiKeyService to avoid circular dependency issues at startup.
   */
  private async authenticateWithApiKey(
    request: Request,
    rawKey: string,
  ): Promise<boolean> {
    if (!this.apiKeyService) {
      this.apiKeyService = this.moduleRef.get(ApiKeyService, { strict: false });
    }

    const apiKey = await this.apiKeyService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Populate request.user with a synthetic payload matching JWT structure
    request.user = {
      sub: apiKey.createdBy,
      id: apiKey.createdBy,
      tenantId: apiKey.tenantId,
      platformRole: 'USER',
      isApiKey: true,
      apiKeyId: apiKey.id,
      apiKeyScopes: apiKey.scopes,
    };

    return true;
  }
}
