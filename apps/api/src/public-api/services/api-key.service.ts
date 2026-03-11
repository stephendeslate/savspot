import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface ValidatedApiKey {
  id: string;
  tenantId: string;
  scopes: unknown;
  rateLimit: number;
  createdBy: string;
  allowedIps: string[];
}

@Injectable()
export class PublicApiKeyService {
  private readonly logger = new Logger(PublicApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateKey(rawKey: string): Promise<ValidatedApiKey | null> {
    const parsed = this.parseKey(rawKey);
    if (!parsed) {
      return null;
    }

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        prefix: parsed.prefix,
        isActive: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`API key expired: id=${apiKey.id}`);
      return null;
    }

    const candidateHash = this.hashKey(rawKey);
    const storedHash = apiKey.keyHash;

    if (candidateHash.length !== storedHash.length) {
      return null;
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    );

    if (!isMatch) {
      return null;
    }

    this.trackUsage(apiKey.id);

    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      createdBy: apiKey.createdBy,
      allowedIps: apiKey.allowedIps,
    };
  }

  checkScopes(keyScopes: unknown, requiredScopes: string[]): boolean {
    if (requiredScopes.length === 0) {
      return true;
    }

    if (!keyScopes || typeof keyScopes !== 'object') {
      return false;
    }

    const scopesObj = keyScopes as Record<string, unknown>;

    return requiredScopes.every((scope) => {
      const [resource, action] = scope.split(':');
      if (!resource || !action) return false;

      const resourceScopes = scopesObj[resource];
      if (Array.isArray(resourceScopes)) {
        return resourceScopes.includes(action);
      }
      if (resourceScopes === true || resourceScopes === '*') {
        return true;
      }
      return false;
    });
  }

  private trackUsage(keyId: string): void {
    this.prisma.apiKey
      .update({
        where: { id: keyId },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to update lastUsedAt for key ${keyId}: ${err.message}`);
      });
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
  }

  private parseKey(rawKey: string): { prefix: string } | null {
    if (!rawKey || !rawKey.startsWith('svs_')) {
      return null;
    }

    const parts = rawKey.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const prefix = parts[1];
    if (!prefix || prefix.length !== 6) {
      return null;
    }

    return { prefix };
  }
}
