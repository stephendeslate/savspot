import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MfaService } from '@/auth/mfa/mfa.service';

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfig() {
  return {
    get: vi.fn((_key: string) => {
      if (_key === 'MFA_ENCRYPTION_KEY') {
        return 'a'.repeat(64); // 32 bytes hex
      }
      return undefined;
    }),
  };
}

function makeTokenService() {
  return {
    generateAccessToken: vi.fn(() => ({
      token: 'access-token',
      jti: 'jti-1',
      expiresAt: new Date(),
    })),
    generateRefreshToken: vi.fn(() => ({
      token: 'refresh-token',
      jti: 'jti-2',
      expiresAt: new Date(),
    })),
  };
}

describe('MfaService', () => {
  let service: MfaService;
  let prisma: ReturnType<typeof makePrisma>;
  let config: ReturnType<typeof makeConfig>;
  let tokenService: ReturnType<typeof makeTokenService>;

  beforeEach(() => {
    prisma = makePrisma();
    config = makeConfig();
    tokenService = makeTokenService();
    service = new MfaService(
      prisma as never,
      config as never,
      tokenService as never,
    );
  });

  describe('generateSecret', () => {
    it('should return a base32 secret and otpauth URL', () => {
      const result = service.generateSecret();
      expect(result.secret).toBeTruthy();
      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
      expect(result.otpauthUrl).toContain('otpauth://totp/SavSpot');
      expect(result.otpauthUrl).toContain(`secret=${result.secret}`);
    });

    it('should generate different secrets each time', () => {
      const r1 = service.generateSecret();
      const r2 = service.generateSecret();
      expect(r1.secret).not.toBe(r2.secret);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token generated for current time', () => {
      const { secret } = service.generateSecret();
      // Generate the token using the same TOTP algorithm
      const time = Math.floor(Date.now() / 1000 / 30);
      const token = generateTestTOTP(service, secret, time);
      expect(service.verifyToken(secret, token)).toBe(true);
    });

    it('should reject an invalid token', () => {
      const { secret } = service.generateSecret();
      expect(service.verifyToken(secret, '000000')).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should round-trip encrypt and decrypt a secret', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const encrypted = service.encryptSecret(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.split(':').length).toBe(3);
      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertexts for the same input', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const e1 = service.encryptSecret(original);
      const e2 = service.encryptSecret(original);
      expect(e1).not.toBe(e2);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate 10 codes of 8 characters each', () => {
      const codes = service.generateRecoveryCodes();
      expect(codes).toHaveLength(10);
      for (const code of codes) {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[a-z0-9]+$/);
      }
    });

    it('should generate unique codes', () => {
      const codes = service.generateRecoveryCodes();
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe('initSetup', () => {
    it('should generate and store encrypted secret', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.initSetup('user-1');
      expect(result.secret).toBeTruthy();
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            mfaSecret: expect.any(String),
          }),
        }),
      );
    });

    it('should throw if MFA is already enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
      });

      await expect(service.initSetup('user-1')).rejects.toThrow(
        'MFA is already enabled',
      );
    });
  });

  describe('confirmSetup', () => {
    it('should throw if no mfaSecret stored', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(service.confirmSetup('user-1', '123456')).rejects.toThrow(
        'MFA setup has not been initiated',
      );
    });
  });

  describe('disableMfa', () => {
    it('should throw if MFA is not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(service.disableMfa('user-1', '123456')).rejects.toThrow(
        'MFA is not enabled',
      );
    });
  });

  describe('useRecoveryCode', () => {
    it('should consume a valid recovery code and return tokens', async () => {
      const codes = ['code1234', 'code5678', 'code9012'];
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER',
        mfaEnabled: true,
        mfaRecoveryCodes: codes,
        memberships: [],
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.useRecoveryCode('user-1', 'code5678');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            mfaRecoveryCodes: ['code1234', 'code9012'],
          },
        }),
      );
    });

    it('should reject an invalid recovery code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaRecoveryCodes: ['code1234'],
        memberships: [],
      });

      await expect(
        service.useRecoveryCode('user-1', 'wrongcode'),
      ).rejects.toThrow('Invalid recovery code');
    });
  });
});

/**
 * Helper to generate TOTP tokens for testing by using the service's
 * verifyToken method in a known time window.
 */
function generateTestTOTP(
  _service: MfaService,
  _secret: string,
  _time: number,
): string {
  // We use the same algorithm as the service to generate a valid token
  const { createHmac } = require('crypto') as typeof import('crypto');
  const base32Decode = (encoded: string): Buffer => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];
    for (let i = 0; i < cleanInput.length; i++) {
      const idx = alphabet.indexOf(cleanInput[i]!);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  };

  const secretBytes = base32Decode(_secret);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(_time));
  const hmac = createHmac('sha1', secretBytes).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      (hmac[offset + 1]! << 16) |
      (hmac[offset + 2]! << 8) |
      hmac[offset + 3]!) %
    1000000;
  return code.toString().padStart(6, '0');
}
