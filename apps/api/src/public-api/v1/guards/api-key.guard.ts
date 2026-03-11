import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PublicApiKeyService, ValidatedApiKey } from '../../services/api-key.service';
import { API_KEY_SCOPES } from '../../decorators/api-key-scopes.decorator';
import { TenantContextService } from '../../../tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createApiError } from '../dto/api-error.dto';

const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class PublicApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(PublicApiKeyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly publicApiKeyService: PublicApiKeyService,
    private readonly tenantContextService: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers[API_KEY_HEADER] as string | undefined;

    const requiredScopes = this.reflector.getAllAndOverride<string[] | undefined>(
      API_KEY_SCOPES,
      [context.getHandler(), context.getClass()],
    );

    const scopesRequired = requiredScopes && requiredScopes.length > 0;

    if (!rawKey) {
      if (scopesRequired) {
        throw new UnauthorizedException(
          createApiError('UNAUTHORIZED', 'API key is required for this endpoint'),
        );
      }
      return true;
    }

    const apiKey = await this.publicApiKeyService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException(
        createApiError('INVALID_API_KEY', 'The provided API key is invalid or expired'),
      );
    }

    if (apiKey.allowedIps.length > 0) {
      const clientIp = this.getClientIp(request);
      if (!apiKey.allowedIps.includes(clientIp)) {
        this.logger.warn(
          `IP ${clientIp} not in allowlist for API key ${apiKey.id}`,
        );
        throw new ForbiddenException(
          createApiError('IP_NOT_ALLOWED', 'Request IP is not in the API key allowlist'),
        );
      }
    }

    if (scopesRequired && !this.publicApiKeyService.checkScopes(apiKey.scopes, requiredScopes)) {
      throw new ForbiddenException(
        createApiError('INSUFFICIENT_SCOPES', 'API key does not have the required scopes', {
          required: requiredScopes,
        }),
      );
    }

    await this.setTenantContext(apiKey);

    request.user = {
      sub: apiKey.createdBy,
      id: apiKey.createdBy,
      tenantId: apiKey.tenantId,
      platformRole: 'USER',
      isApiKey: true,
      apiKeyId: apiKey.id,
      apiKeyScopes: apiKey.scopes,
    };

    (request as unknown as Record<string, unknown>)['apiKey'] = apiKey;

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]!.trim();
    }
    return request.ip || '0.0.0.0';
  }

  private async setTenantContext(apiKey: ValidatedApiKey): Promise<void> {
    this.tenantContextService.setCurrentTenantId(apiKey.tenantId);

    try {
      await this.prisma.$executeRaw`
        SELECT set_config('app.current_tenant', ${apiKey.tenantId}, TRUE)
      `;
    } catch (error) {
      this.logger.error(
        `Failed to set tenant context for tenant ${apiKey.tenantId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
