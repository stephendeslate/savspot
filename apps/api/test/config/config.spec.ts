import { describe, it, expect } from 'vitest';
import { envSchema, validateEnv } from '@/config/env.validation';

/**
 * Supplementary config tests covering fields NOT tested in env.validation.spec.ts.
 * The existing test covers DATABASE_URL, REDIS_URL, PORT, NODE_ENV, WEB_URL, and validateEnv.
 * This file covers JWT, Stripe, Google, Twilio, R2, VAPID, Apple, AI, and edge cases.
 */
describe('envSchema — extended fields', () => {
  // ---------- JWT ----------
  describe('JWT fields', () => {
    it('should default JWT_ACCESS_EXPIRY to 15m', () => {
      const result = envSchema.parse({});
      expect(result.JWT_ACCESS_EXPIRY).toBe('15m');
    });

    it('should default JWT_REFRESH_EXPIRY to 7d', () => {
      const result = envSchema.parse({});
      expect(result.JWT_REFRESH_EXPIRY).toBe('7d');
    });

    it('should accept custom JWT expiry values', () => {
      const result = envSchema.parse({
        JWT_ACCESS_EXPIRY: '30m',
        JWT_REFRESH_EXPIRY: '14d',
      });
      expect(result.JWT_ACCESS_EXPIRY).toBe('30m');
      expect(result.JWT_REFRESH_EXPIRY).toBe('14d');
    });

    it('should leave JWT key fields undefined when not provided', () => {
      const result = envSchema.parse({});
      expect(result.JWT_PRIVATE_KEY_BASE64).toBeUndefined();
      expect(result.JWT_PUBLIC_KEY_BASE64).toBeUndefined();
    });
  });

  // ---------- Stripe ----------
  describe('STRIPE_PLATFORM_FEE_PERCENT', () => {
    it('should default to 1', () => {
      const result = envSchema.parse({});
      expect(result.STRIPE_PLATFORM_FEE_PERCENT).toBe(1);
    });

    it('should accept a valid fee percentage', () => {
      const result = envSchema.parse({ STRIPE_PLATFORM_FEE_PERCENT: '5' });
      expect(result.STRIPE_PLATFORM_FEE_PERCENT).toBe(5);
    });

    it('should reject a fee over 100', () => {
      const result = envSchema.safeParse({
        STRIPE_PLATFORM_FEE_PERCENT: '101',
      });
      expect(result.success).toBe(false);
    });

    it('should reject a negative fee', () => {
      const result = envSchema.safeParse({
        STRIPE_PLATFORM_FEE_PERCENT: '-1',
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------- Google Callback ----------
  describe('GOOGLE_CALLBACK_URL', () => {
    it('should default to localhost callback URL', () => {
      const result = envSchema.parse({});
      expect(result.GOOGLE_CALLBACK_URL).toBe(
        'http://localhost:3001/api/auth/google/callback',
      );
    });

    it('should reject non-URL values', () => {
      const result = envSchema.safeParse({
        GOOGLE_CALLBACK_URL: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------- Resend ----------
  describe('RESEND_FROM_EMAIL', () => {
    it('should default to onboarding@savspot.co', () => {
      const result = envSchema.parse({});
      expect(result.RESEND_FROM_EMAIL).toBe('onboarding@savspot.co');
    });

    it('should reject a non-email string', () => {
      const result = envSchema.safeParse({ RESEND_FROM_EMAIL: 'not-email' });
      expect(result.success).toBe(false);
    });
  });

  // ---------- AI_CONFIDENCE_THRESHOLD ----------
  describe('AI_CONFIDENCE_THRESHOLD', () => {
    it('should default to 0.85', () => {
      const result = envSchema.parse({});
      expect(result.AI_CONFIDENCE_THRESHOLD).toBe(0.85);
    });

    it('should accept values between 0 and 1', () => {
      const result = envSchema.parse({ AI_CONFIDENCE_THRESHOLD: '0.5' });
      expect(result.AI_CONFIDENCE_THRESHOLD).toBe(0.5);
    });

    it('should reject values greater than 1', () => {
      const result = envSchema.safeParse({ AI_CONFIDENCE_THRESHOLD: '1.5' });
      expect(result.success).toBe(false);
    });

    it('should reject negative values', () => {
      const result = envSchema.safeParse({ AI_CONFIDENCE_THRESHOLD: '-0.1' });
      expect(result.success).toBe(false);
    });
  });

  // ---------- VAPID ----------
  describe('VAPID_SUBJECT', () => {
    it('should default to mailto:support@savspot.co', () => {
      const result = envSchema.parse({});
      expect(result.VAPID_SUBJECT).toBe('mailto:support@savspot.co');
    });
  });

  // ---------- Ollama ----------
  describe('Ollama fields', () => {
    it('should default OLLAMA_URL to localhost', () => {
      const result = envSchema.parse({});
      expect(result.OLLAMA_URL).toBe('http://localhost:11434');
    });

    it('should default OLLAMA_MODEL to qwen3-coder-next', () => {
      const result = envSchema.parse({});
      expect(result.OLLAMA_MODEL).toBe('qwen3-coder-next');
    });
  });

  // ---------- SENTRY_DSN ----------
  describe('SENTRY_DSN', () => {
    it('should be optional', () => {
      const result = envSchema.parse({});
      expect(result.SENTRY_DSN).toBeUndefined();
    });

    it('should reject a non-URL string', () => {
      const result = envSchema.safeParse({ SENTRY_DSN: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should accept a valid URL', () => {
      const result = envSchema.parse({
        SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0',
      });
      expect(result.SENTRY_DSN).toBe(
        'https://examplePublicKey@o0.ingest.sentry.io/0',
      );
    });
  });
});

describe('validateEnv — extended', () => {
  it('should parse optional Stripe fields without error', () => {
    const config = validateEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    });
    expect(config.STRIPE_SECRET_KEY).toBe('sk_test_123');
    expect(config.STRIPE_PUBLISHABLE_KEY).toBe('pk_test_123');
  });

  it('should parse all optional fields as undefined when missing', () => {
    const config = validateEnv({});
    expect(config.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(config.TWILIO_ACCOUNT_SID).toBeUndefined();
    expect(config.R2_ACCOUNT_ID).toBeUndefined();
    expect(config.APPLE_CLIENT_ID).toBeUndefined();
    expect(config.ENCRYPTION_KEY).toBeUndefined();
    expect(config.MFA_ENCRYPTION_KEY).toBeUndefined();
  });
});
