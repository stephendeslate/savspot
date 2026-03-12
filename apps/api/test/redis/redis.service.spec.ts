import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisService } from '@/redis/redis.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRedisClient() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    sadd: vi.fn(),
    sismember: vi.fn(),
    srem: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  };
}

function makeConfigService() {
  return {
    get: vi.fn().mockReturnValue('redis://localhost:6379'),
  };
}

// Mock ioredis to avoid real connections
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => makeRedisClient()),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let client: ReturnType<typeof makeRedisClient>;

  beforeEach(() => {
    const configService = makeConfigService();
    service = new RedisService(configService as never);
    // Access the private client through getClient()
    client = service.getClient() as unknown as ReturnType<typeof makeRedisClient>;
  });

  // ---------- get ----------
  describe('get', () => {
    it('should return the cached value for an existing key', async () => {
      client.get.mockResolvedValue('cached-value');

      const result = await service.get('test-key');

      expect(result).toBe('cached-value');
      expect(client.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for a missing key', async () => {
      client.get.mockResolvedValue(null);

      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });
  });

  // ---------- set ----------
  describe('set', () => {
    it('should set a key-value pair and return OK', async () => {
      client.set.mockResolvedValue('OK');

      const result = await service.set('key', 'value');

      expect(result).toBe('OK');
      expect(client.set).toHaveBeenCalledWith('key', 'value');
    });
  });

  // ---------- setex ----------
  describe('setex', () => {
    it('should set a key with TTL', async () => {
      client.setex.mockResolvedValue('OK');

      const result = await service.setex('session:abc', 3600, 'data');

      expect(result).toBe('OK');
      expect(client.setex).toHaveBeenCalledWith('session:abc', 3600, 'data');
    });
  });

  // ---------- del ----------
  describe('del', () => {
    it('should delete a single key and return count', async () => {
      client.del.mockResolvedValue(1);

      const result = await service.del('key1');

      expect(result).toBe(1);
      expect(client.del).toHaveBeenCalledWith('key1');
    });

    it('should delete multiple keys', async () => {
      client.del.mockResolvedValue(3);

      const result = await service.del('key1', 'key2', 'key3');

      expect(result).toBe(3);
      expect(client.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });
  });

  // ---------- exists ----------
  describe('exists', () => {
    it('should return 1 when key exists', async () => {
      client.exists.mockResolvedValue(1);

      const result = await service.exists('key1');

      expect(result).toBe(1);
    });

    it('should return 0 when key does not exist', async () => {
      client.exists.mockResolvedValue(0);

      const result = await service.exists('missing');

      expect(result).toBe(0);
    });
  });

  // ---------- expire ----------
  describe('expire', () => {
    it('should set TTL on an existing key', async () => {
      client.expire.mockResolvedValue(1);

      const result = await service.expire('key', 300);

      expect(result).toBe(1);
      expect(client.expire).toHaveBeenCalledWith('key', 300);
    });
  });

  // ---------- set operations ----------
  describe('sadd', () => {
    it('should add members to a set', async () => {
      client.sadd.mockResolvedValue(2);

      const result = await service.sadd('myset', 'a', 'b');

      expect(result).toBe(2);
      expect(client.sadd).toHaveBeenCalledWith('myset', 'a', 'b');
    });
  });

  describe('sismember', () => {
    it('should return 1 if member exists in set', async () => {
      client.sismember.mockResolvedValue(1);

      const result = await service.sismember('myset', 'a');

      expect(result).toBe(1);
    });

    it('should return 0 if member does not exist in set', async () => {
      client.sismember.mockResolvedValue(0);

      const result = await service.sismember('myset', 'z');

      expect(result).toBe(0);
    });
  });

  describe('srem', () => {
    it('should remove members from a set', async () => {
      client.srem.mockResolvedValue(1);

      const result = await service.srem('myset', 'a');

      expect(result).toBe(1);
      expect(client.srem).toHaveBeenCalledWith('myset', 'a');
    });
  });

  // ---------- lifecycle ----------
  describe('onModuleDestroy', () => {
    it('should call quit on the redis client', async () => {
      client.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(client.quit).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return the underlying redis client', () => {
      const result = service.getClient();

      expect(result).toBeDefined();
    });
  });
});
