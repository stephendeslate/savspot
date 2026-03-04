import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ApiKey, Prisma } from '../../../../prisma/generated/prisma';

/** Format: svs_{6-char-prefix}_{64-char-hex-secret} */
const KEY_PREFIX_LENGTH = 6;
const KEY_SECRET_BYTES = 32; // 32 bytes = 64 hex chars

export interface GeneratedApiKey {
  /** The full raw key — shown to the user exactly once */
  rawKey: string;
  /** The persisted ApiKey record (without keyHash) */
  apiKey: Omit<ApiKey, 'keyHash'>;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key for a tenant.
   *
   * Key format: svs_{prefix}_{secret}
   *   - prefix: 6-char random hex (used for DB lookup)
   *   - secret: 64-char random hex
   *   - Full key is SHA-256 hashed and stored; only the prefix is stored in cleartext.
   *
   * @returns The full raw key (shown once) and the created ApiKey record.
   */
  async generateKey(
    tenantId: string,
    creatorId: string,
    name: string,
    permissions?: Record<string, unknown>,
    expiresAt?: Date,
  ): Promise<GeneratedApiKey> {
    const prefix = crypto.randomBytes(KEY_PREFIX_LENGTH / 2 + 1).toString('hex').slice(0, KEY_PREFIX_LENGTH);
    const secret = crypto.randomBytes(KEY_SECRET_BYTES).toString('hex');
    const rawKey = `svs_${prefix}_${secret}`;

    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        createdBy: creatorId,
        name,
        prefix,
        keyHash,
        scopes: (permissions ?? {}) as Prisma.InputJsonValue,
        expiresAt: expiresAt ?? null,
      },
    });

    this.logger.log(
      `API key created: id=${apiKey.id} prefix=${prefix} tenant=${tenantId}`,
    );

    // Strip keyHash from the returned record
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _hash, ...safeApiKey } = apiKey;
    return { rawKey, apiKey: safeApiKey };
  }

  /**
   * Validate a raw API key string.
   *
   * 1. Parse the prefix from the key.
   * 2. Look up active key by prefix.
   * 3. SHA-256 hash the raw key and compare with stored hash.
   * 4. Check expiration.
   * 5. If valid, update lastUsedAt and return the ApiKey record.
   *
   * @returns The ApiKey record (without keyHash) if valid, or null.
   */
  async validateKey(rawKey: string): Promise<Omit<ApiKey, 'keyHash'> | null> {
    const parsed = this.parseKey(rawKey);
    if (!parsed) {
      return null;
    }

    const { prefix } = parsed;

    // Lookup by prefix + active
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        prefix,
        isActive: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`API key expired: id=${apiKey.id}`);
      return null;
    }

    // Constant-time hash comparison
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

    // Update lastUsedAt (fire-and-forget to avoid latency)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to update lastUsedAt for key ${apiKey.id}: ${err.message}`);
      });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _hash, ...safeApiKey } = apiKey;
    return safeApiKey;
  }

  /**
   * List all API keys for a tenant (never returns keyHash).
   */
  async findAll(tenantId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return keys;
  }

  /**
   * Revoke an API key by setting isActive=false and recording the revocation time.
   */
  async revoke(tenantId: string, keyId: string): Promise<Omit<ApiKey, 'keyHash'>> {
    const apiKey = await this.prisma.apiKey.update({
      where: { id: keyId, tenantId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`API key revoked: id=${keyId} tenant=${tenantId}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _hash, ...safeApiKey } = apiKey;
    return safeApiKey;
  }

  // ─── Private helpers ──────────────────────────────────────────

  /** SHA-256 hash of the full raw key, returned as hex string. */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
  }

  /**
   * Parse the prefix from a raw key.
   * Expected format: svs_{prefix}_{secret}
   */
  private parseKey(rawKey: string): { prefix: string } | null {
    if (!rawKey || !rawKey.startsWith('svs_')) {
      return null;
    }

    const parts = rawKey.split('_');
    // Expected: ['svs', prefix, secret]
    if (parts.length !== 3) {
      return null;
    }

    const prefix = parts[1];
    if (!prefix || prefix.length !== KEY_PREFIX_LENGTH) {
      return null;
    }

    return { prefix };
  }
}
