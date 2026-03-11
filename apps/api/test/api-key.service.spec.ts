import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { ApiKeyService } from '@/auth/api-key.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CREATOR_ID = 'user-001';
const KEY_ID = 'key-001';
const KEY_NAME = 'My API Key';

function makePrisma() {
  return {
    apiKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeApiKeyRecord(overrides: Partial<{
  id: string;
  tenantId: string;
  createdBy: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: Record<string, string>;
  rateLimit: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  revokedAt: Date | null;
}> = {}) {
  return {
    id: KEY_ID,
    tenantId: TENANT_ID,
    createdBy: CREATOR_ID,
    name: KEY_NAME,
    prefix: 'ab12cd',
    keyHash: 'somehashvalue',
    scopes: {},
    rateLimit: 1000,
    lastUsedAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date('2026-03-01T12:00:00Z'),
    revokedAt: null,
    ...overrides,
  };
}

/** Hash a raw key the same way the service does */
function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ApiKeyService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // generateKey
  // -----------------------------------------------------------------------

  describe('generateKey', () => {
    it('should return rawKey and apiKey record', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
          name: args.data['name'] as string,
          scopes: args.data['scopes'] as Record<string, string>,
          expiresAt: args.data['expiresAt'] as Date | null,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(result).toHaveProperty('rawKey');
      expect(result).toHaveProperty('apiKey');
    });

    it('should return a rawKey that starts with svs_', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(result.rawKey).toMatch(/^svs_/);
    });

    it('should return a rawKey with correct format (3 parts separated by _)', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      const parts = result.rawKey.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('svs');
      expect(parts[1]).toHaveLength(6); // 6-char hex prefix
      expect(parts[2]).toHaveLength(64); // 64-char hex secret
    });

    it('should return apiKey record WITHOUT keyHash', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(result.apiKey).not.toHaveProperty('keyHash');
      expect(result.apiKey).toHaveProperty('id');
      expect(result.apiKey).toHaveProperty('tenantId');
      expect(result.apiKey).toHaveProperty('prefix');
    });

    it('should call prisma.apiKey.create with correct tenantId, creatorId, and name', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            createdBy: CREATOR_ID,
            name: KEY_NAME,
          }),
        }),
      );
    });

    it('should store SHA-256 hash of the full rawKey in keyHash', async () => {
      let capturedKeyHash = '';

      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        capturedKeyHash = args.data['keyHash'] as string;
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);
      const expectedHash = hashKey(result.rawKey);

      expect(capturedKeyHash).toBe(expectedHash);
    });

    it('should store the prefix extracted from the rawKey', async () => {
      let capturedPrefix = '';

      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        capturedPrefix = args.data['prefix'] as string;
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);
      const rawKeyPrefix = result.rawKey.split('_')[1];

      expect(capturedPrefix).toBe(rawKeyPrefix);
    });

    it('should pass permissions as scopes when provided', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
          scopes: args.data['scopes'] as Record<string, string>,
        });
      });

      const permissions = { bookings: 'read', services: 'write' };

      await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME, permissions);

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scopes: permissions,
          }),
        }),
      );
    });

    it('should default scopes to empty object when permissions not provided', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
          scopes: args.data['scopes'] as Record<string, string>,
        });
      });

      await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scopes: {},
          }),
        }),
      );
    });

    it('should pass expiresAt when provided', async () => {
      const expiresAt = new Date('2026-12-31T23:59:59Z');

      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
          expiresAt: args.data['expiresAt'] as Date | null,
        });
      });

      await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME, undefined, expiresAt);

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt,
          }),
        }),
      );
    });

    it('should set expiresAt to null when not provided', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: null,
          }),
        }),
      );
    });

    it('should generate unique keys on consecutive calls', async () => {
      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const result1 = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);
      const result2 = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      expect(result1.rawKey).not.toBe(result2.rawKey);
    });
  });

  // -----------------------------------------------------------------------
  // validateKey
  // -----------------------------------------------------------------------

  describe('validateKey', () => {
    it('should return null for a key that does not start with svs_', async () => {
      const result = await service.validateKey('invalid_abc123_secret');

      expect(result).toBeNull();
      expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for an empty string', async () => {
      const result = await service.validateKey('');

      expect(result).toBeNull();
    });

    it('should return null for a key with wrong number of segments (too few)', async () => {
      const result = await service.validateKey('svs_abc123');

      expect(result).toBeNull();
      expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for a key with wrong number of segments (too many)', async () => {
      const result = await service.validateKey('svs_abc123_secret_extra');

      expect(result).toBeNull();
      expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for a key with wrong prefix length', async () => {
      const result = await service.validateKey('svs_ab_' + 'a'.repeat(64));

      expect(result).toBeNull();
      expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should return null when no matching prefix found in DB', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateKey('svs_abcdef_' + 'a'.repeat(64));

      expect(result).toBeNull();
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          prefix: 'abcdef',
          isActive: true,
        },
      });
    });

    it('should return null when key is expired', async () => {
      const expiredKey = makeApiKeyRecord({
        prefix: 'abcdef',
        expiresAt: new Date('2020-01-01T00:00:00Z'), // already expired
      });
      prisma.apiKey.findFirst.mockResolvedValue(expiredKey);

      const result = await service.validateKey('svs_abcdef_' + 'a'.repeat(64));

      expect(result).toBeNull();
    });

    it('should return null when hash does not match (wrong secret)', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const correctHash = hashKey(rawKey);

      // Store a different hash to simulate mismatch
      const differentRawKey = 'svs_abcdef_' + 'b'.repeat(64);
      const differentHash = hashKey(differentRawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash: differentHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);

      const result = await service.validateKey(rawKey);

      expect(result).toBeNull();
      expect(correctHash).not.toBe(differentHash);
    });

    it('should return the apiKey (without keyHash) for a valid key', async () => {
      // Generate a real key, capture its hash, then validate it
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockResolvedValue(dbKey);

      const result = await service.validateKey(rawKey);

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('keyHash');
      expect(result).toHaveProperty('id', KEY_ID);
      expect(result).toHaveProperty('tenantId', TENANT_ID);
      expect(result).toHaveProperty('prefix', 'abcdef');
    });

    it('should return all expected fields except keyHash on successful validation', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockResolvedValue(dbKey);

      const result = await service.validateKey(rawKey);

      expect(result).toEqual(
        expect.objectContaining({
          id: KEY_ID,
          tenantId: TENANT_ID,
          createdBy: CREATOR_ID,
          name: KEY_NAME,
          prefix: 'abcdef',
          scopes: {},
          isActive: true,
        }),
      );
      expect(result).not.toHaveProperty('keyHash');
    });

    it('should update lastUsedAt on successful validation (fire-and-forget)', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockResolvedValue(dbKey);

      await service.validateKey(rawKey);

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: KEY_ID },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should validate a key with a future expiresAt date', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: new Date('2099-12-31T23:59:59Z'), // far future
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockResolvedValue(dbKey);

      const result = await service.validateKey(rawKey);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', KEY_ID);
    });

    it('should validate a key with null expiresAt (never expires)', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockResolvedValue(dbKey);

      const result = await service.validateKey(rawKey);

      expect(result).not.toBeNull();
    });

    it('should look up key by prefix and isActive=true', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      await service.validateKey('svs_abcdef_' + 'a'.repeat(64));

      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          prefix: 'abcdef',
          isActive: true,
        },
      });
    });

    it('should not update lastUsedAt when validation fails', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      await service.validateKey('svs_abcdef_' + 'a'.repeat(64));

      expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });

    it('should not throw when lastUsedAt update fails (fire-and-forget)', async () => {
      const rawKey = 'svs_abcdef_' + 'a'.repeat(64);
      const keyHash = hashKey(rawKey);

      const dbKey = makeApiKeyRecord({
        prefix: 'abcdef',
        keyHash,
        expiresAt: null,
      });
      prisma.apiKey.findFirst.mockResolvedValue(dbKey);
      prisma.apiKey.update.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.validateKey(rawKey);

      // Should still return the valid key even if update fails
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', KEY_ID);
    });

    it('should work end-to-end: generate then validate', async () => {
      let storedHash = '';
      let storedPrefix = '';

      prisma.apiKey.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        storedHash = args.data['keyHash'] as string;
        storedPrefix = args.data['prefix'] as string;
        return makeApiKeyRecord({
          prefix: args.data['prefix'] as string,
          keyHash: args.data['keyHash'] as string,
        });
      });

      const generated = await service.generateKey(TENANT_ID, CREATOR_ID, KEY_NAME);

      // Now set up findFirst to return the stored key with the real hash
      prisma.apiKey.findFirst.mockResolvedValue(
        makeApiKeyRecord({
          prefix: storedPrefix,
          keyHash: storedHash,
        }),
      );
      prisma.apiKey.update.mockResolvedValue(
        makeApiKeyRecord({
          prefix: storedPrefix,
          keyHash: storedHash,
        }),
      );

      const validated = await service.validateKey(generated.rawKey);

      expect(validated).not.toBeNull();
      expect(validated).toHaveProperty('id', KEY_ID);
      expect(validated).not.toHaveProperty('keyHash');
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return an array of keys', async () => {
      const keys = [
        makeApiKeyRecord({ id: 'key-001', name: 'Key 1' }),
        makeApiKeyRecord({ id: 'key-002', name: 'Key 2' }),
      ];
      // findMany with select returns objects without keyHash
       
      const keysWithoutHash = keys.map(({ keyHash: _h, ...rest }) => rest);
      prisma.apiKey.findMany.mockResolvedValue(keysWithoutHash);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'key-001');
      expect(result[1]).toHaveProperty('id', 'key-002');
    });

    it('should return empty array when no keys exist', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should filter by tenantId', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID);

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID);

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should use select to exclude keyHash', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID);

      const findManyArgs = prisma.apiKey.findMany.mock.calls[0]![0];
      expect(findManyArgs.select).toBeDefined();
      expect(findManyArgs.select).not.toHaveProperty('keyHash');
      expect(findManyArgs.select.id).toBe(true);
      expect(findManyArgs.select.tenantId).toBe(true);
      expect(findManyArgs.select.name).toBe(true);
      expect(findManyArgs.select.prefix).toBe(true);
      expect(findManyArgs.select.scopes).toBe(true);
      expect(findManyArgs.select.rateLimit).toBe(true);
      expect(findManyArgs.select.lastUsedAt).toBe(true);
      expect(findManyArgs.select.expiresAt).toBe(true);
      expect(findManyArgs.select.isActive).toBe(true);
      expect(findManyArgs.select.createdBy).toBe(true);
      expect(findManyArgs.select.createdAt).toBe(true);
      expect(findManyArgs.select.revokedAt).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // revoke
  // -----------------------------------------------------------------------

  describe('revoke', () => {
    it('should set isActive=false and revokedAt', async () => {
      const revokedKey = makeApiKeyRecord({
        isActive: false,
        revokedAt: new Date('2026-03-03T12:00:00Z'),
      });
      prisma.apiKey.update.mockResolvedValue(revokedKey);

      await service.revoke(TENANT_ID, KEY_ID);

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: KEY_ID, tenantId: TENANT_ID },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should return the key without keyHash', async () => {
      const revokedKey = makeApiKeyRecord({
        isActive: false,
        revokedAt: new Date('2026-03-03T12:00:00Z'),
      });
      prisma.apiKey.update.mockResolvedValue(revokedKey);

      const result = await service.revoke(TENANT_ID, KEY_ID);

      expect(result).not.toHaveProperty('keyHash');
      expect(result).toHaveProperty('id', KEY_ID);
      expect(result).toHaveProperty('isActive', false);
      expect(result).toHaveProperty('revokedAt');
    });

    it('should scope the update to the correct tenantId and keyId', async () => {
      const revokedKey = makeApiKeyRecord({
        id: 'key-999',
        tenantId: 'tenant-999',
        isActive: false,
        revokedAt: new Date(),
      });
      prisma.apiKey.update.mockResolvedValue(revokedKey);

      await service.revoke('tenant-999', 'key-999');

      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-999', tenantId: 'tenant-999' },
        }),
      );
    });

    it('should return all expected fields except keyHash', async () => {
      const revokedKey = makeApiKeyRecord({
        isActive: false,
        revokedAt: new Date('2026-03-03T12:00:00Z'),
      });
      prisma.apiKey.update.mockResolvedValue(revokedKey);

      const result = await service.revoke(TENANT_ID, KEY_ID);

      expect(result).toEqual(
        expect.objectContaining({
          id: KEY_ID,
          tenantId: TENANT_ID,
          createdBy: CREATOR_ID,
          name: KEY_NAME,
          prefix: 'ab12cd',
          scopes: {},
          isActive: false,
          revokedAt: expect.any(Date),
        }),
      );
      expect(result).not.toHaveProperty('keyHash');
    });

    it('should propagate errors from prisma.apiKey.update', async () => {
      prisma.apiKey.update.mockRejectedValue(
        new Error('Record to update not found'),
      );

      await expect(service.revoke(TENANT_ID, 'nonexistent-key')).rejects.toThrow(
        'Record to update not found',
      );
    });
  });
});
