import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

const API_KEY_HEADER = 'x-api-key';

/**
 * Guard that authenticates requests using the X-API-Key header.
 *
 * Behaviour:
 *   - If the header is NOT present, returns true so the JWT guard can handle auth.
 *   - If the header IS present, validates the key via ApiKeyService.
 *     - Valid:   populates request.user with a synthetic user payload and returns true.
 *     - Invalid: throws UnauthorizedException.
 *
 * This guard is designed to be called from within JwtAuthGuard as a fallback
 * when JWT authentication fails, providing API key auth as an alternative.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers[API_KEY_HEADER] as string | undefined;

    // No X-API-Key header — pass through to JWT auth
    if (!rawKey) {
      return true;
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
