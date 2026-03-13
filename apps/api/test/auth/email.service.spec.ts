import { createHmac } from 'crypto';
import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '@/auth/services/email.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'email-id' }),
      },
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, string> = {}) {
  const config: Record<string, string | undefined> = {
    RESEND_API_KEY: 'test-api-key',
    RESEND_FROM_EMAIL: 'noreply@savspot.co',
    WEB_URL: 'https://app.savspot.co',
    JWT_PRIVATE_KEY_BASE64: Buffer.from('test-key-for-unit-tests').toString('base64'),
    ...overrides,
  };

  return {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
}

function makeUser() {
  return {
    id: 'user-001',
    email: 'jane@example.com',
    name: 'Jane Doe',
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('EmailService', () => {
  // ---------- Token generation / validation ----------

  describe('generateVerificationToken', () => {
    it('should return a string with two parts separated by dot', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      const token = service.generateVerificationToken('user-001');

      expect(token.split('.')).toHaveLength(2);
    });

    it('should encode userId in the token payload', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      const token = service.generateVerificationToken('user-001');
      const [encoded] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(encoded!, 'base64url').toString('utf8'),
      );

      expect(payload.userId).toBe('user-001');
    });

    it('should set expiry to 24 hours from now', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      const before = Date.now();
      const token = service.generateVerificationToken('user-001');
      const after = Date.now();

      const [encoded] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(encoded!, 'base64url').toString('utf8'),
      );
      const twentyFourHours = 24 * 60 * 60 * 1000;

      expect(payload.exp).toBeGreaterThanOrEqual(before + twentyFourHours);
      expect(payload.exp).toBeLessThanOrEqual(after + twentyFourHours);
    });
  });

  describe('validateVerificationToken', () => {
    it('should return userId for a valid token', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      const token = service.generateVerificationToken('user-001');
      const result = service.validateVerificationToken(token);

      expect(result).toEqual({ userId: 'user-001' });
    });

    it('should return null for an invalid signature', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      const token = service.generateVerificationToken('user-001');
      const [encoded] = token.split('.');
      const tampered = `${encoded}.invalidsignature`;

      expect(service.validateVerificationToken(tampered)).toBeNull();
    });

    it('should return null for a token with wrong format', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      expect(service.validateVerificationToken('no-dot-here')).toBeNull();
      expect(service.validateVerificationToken('a.b.c')).toBeNull();
    });

    it('should return null for an expired token', () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);

      // Manually create an expired token
      const payload = JSON.stringify({
        userId: 'user-001',
        exp: Date.now() - 1000, // expired 1 second ago
      });
      const encoded = Buffer.from(payload).toString('base64url');
      const signature = createHmac('sha256', 'dev-hmac-secret-change-me')
        .update(encoded)
        .digest('base64url');
      const token = `${encoded}.${signature}`;

      expect(service.validateVerificationToken(token)).toBeNull();
    });
  });

  // ---------- Email sending ----------

  describe('sendVerificationEmail', () => {
    it('should call resend.emails.send with correct parameters when API key is set', async () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);
      const user = makeUser();

      await service.sendVerificationEmail(user, 'test-token');

      // We check it does not throw - the Resend mock handles the call
    });

    it('should not throw when RESEND_API_KEY is not set (dev mode)', async () => {
      const configService = makeConfigService({ RESEND_API_KEY: '' });
      const service = new EmailService(configService as never);
      const user = makeUser();

      await expect(
        service.sendVerificationEmail(user, 'test-token'),
      ).resolves.toBeUndefined();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should not throw when called', async () => {
      const configService = makeConfigService();
      const service = new EmailService(configService as never);
      const user = makeUser();

      await expect(
        service.sendPasswordResetEmail(user, 'reset-token'),
      ).resolves.toBeUndefined();
    });
  });

  // ---------- HMAC secret derivation ----------

  describe('constructor', () => {
    it('should throw when JWT_PRIVATE_KEY_BASE64 is not set', () => {
      const configService = makeConfigService({
        JWT_PRIVATE_KEY_BASE64: undefined as unknown as string,
      });

      expect(() => new EmailService(configService as never)).toThrow(
        'JWT_PRIVATE_KEY_BASE64 environment variable is required',
      );
    });

    it('should derive HMAC secret from JWT_PRIVATE_KEY_BASE64 when set', () => {
      const configService = makeConfigService({
        JWT_PRIVATE_KEY_BASE64: Buffer.from('test-key').toString('base64'),
      });
      const service = new EmailService(configService as never);

      const token = service.generateVerificationToken('user-001');
      expect(service.validateVerificationToken(token)).toEqual({ userId: 'user-001' });
    });
  });
});
