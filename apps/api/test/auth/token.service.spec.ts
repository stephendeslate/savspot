import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenService } from '@/auth/services/token.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const config: Record<string, string | undefined> = {
    JWT_PRIVATE_KEY_BASE64: undefined,
    JWT_PUBLIC_KEY_BASE64: undefined,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    ...overrides,
  };

  return {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
}

function makeRedisService() {
  return {
    setex: vi.fn().mockResolvedValue('OK'),
    exists: vi.fn().mockResolvedValue(0),
  };
}

const TEST_PAYLOAD = {
  sub: 'user-001',
  email: 'jane@example.com',
  platformRole: 'USER',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TokenService', () => {
  let service: TokenService;
  let redisService: ReturnType<typeof makeRedisService>;

  beforeEach(() => {
    const configService = makeConfigService();
    redisService = makeRedisService();
    service = new TokenService(configService as never, redisService as never);
  });

  // ---------- getPublicKey ----------

  describe('getPublicKey', () => {
    it('should return a PEM public key string', () => {
      const publicKey = service.getPublicKey();

      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });
  });

  // ---------- generateAccessToken ----------

  describe('generateAccessToken', () => {
    it('should return a signed token with jti and expiresAt', () => {
      const result = service.generateAccessToken(TEST_PAYLOAD);

      expect(result.token).toBeTruthy();
      expect(result.jti).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should produce a verifiable token', () => {
      const { token } = service.generateAccessToken(TEST_PAYLOAD);
      const verified = service.verifyToken(token);

      expect(verified.sub).toBe('user-001');
      expect(verified.email).toBe('jane@example.com');
    });
  });

  // ---------- generateRefreshToken ----------

  describe('generateRefreshToken', () => {
    it('should return a signed refresh token', () => {
      const result = service.generateRefreshToken(TEST_PAYLOAD);

      expect(result.token).toBeTruthy();
      expect(result.jti).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should include type=refresh in the token payload', () => {
      const { token } = service.generateRefreshToken(TEST_PAYLOAD);
      const verified = service.verifyToken(token);

      expect(verified.type).toBe('refresh');
    });
  });

  // ---------- verifyToken ----------

  describe('verifyToken', () => {
    it('should throw on invalid token', () => {
      expect(() => service.verifyToken('garbage.token.here')).toThrow();
    });

    it('should throw on token signed with different key', () => {
      const otherService = new TokenService(
        makeConfigService() as never,
        makeRedisService() as never,
      );
      const { token } = otherService.generateAccessToken(TEST_PAYLOAD);

      // Different ephemeral keypair, so verification should fail
      expect(() => service.verifyToken(token)).toThrow();
    });
  });

  // ---------- blacklistToken ----------

  describe('blacklistToken', () => {
    it('should store blacklisted jti in Redis with TTL', async () => {
      const expiresAt = new Date(Date.now() + 60000); // 60 seconds

      await service.blacklistToken('jti-123', expiresAt);

      expect(redisService.setex).toHaveBeenCalledWith(
        'token:blacklist:jti-123',
        expect.any(Number),
        '1',
      );

      const ttl = redisService.setex.mock.calls[0]![1] as number;
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should use minimum TTL of 1 second for already expired tokens', async () => {
      const expiresAt = new Date(Date.now() - 10000); // already expired

      await service.blacklistToken('jti-123', expiresAt);

      const ttl = redisService.setex.mock.calls[0]![1] as number;
      expect(ttl).toBe(1);
    });
  });

  // ---------- isBlacklisted ----------

  describe('isBlacklisted', () => {
    it('should return false when token is not in Redis', async () => {
      redisService.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted('jti-123');

      expect(result).toBe(false);
      expect(redisService.exists).toHaveBeenCalledWith('token:blacklist:jti-123');
    });

    it('should return true when token exists in Redis', async () => {
      redisService.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted('jti-123');

      expect(result).toBe(true);
    });
  });
});
