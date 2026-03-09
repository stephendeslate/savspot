import { describe, it, expect } from 'vitest';
import { envSchema, validateEnv } from '@/config/env.validation';

describe('envSchema', () => {
  describe('defaults', () => {
    it('should provide sensible defaults when no env vars are set', () => {
      const result = envSchema.parse({});
      expect(result.DATABASE_URL).toBe('postgresql://savspot:savspot_dev@localhost:5432/savspot_dev');
      expect(result.REDIS_URL).toBe('redis://localhost:6379');
      expect(result.PORT).toBe(3001);
      expect(result.NODE_ENV).toBe('development');
      expect(result.WEB_URL).toBe('http://localhost:3000');
    });
  });

  describe('DATABASE_URL', () => {
    it('should accept a valid PostgreSQL connection string', () => {
      const result = envSchema.parse({
        DATABASE_URL: 'postgresql://user:pass@host:5432/dbname',
      });
      expect(result.DATABASE_URL).toBe('postgresql://user:pass@host:5432/dbname');
    });

    it('should reject a non-URL string', () => {
      const result = envSchema.safeParse({
        DATABASE_URL: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('REDIS_URL', () => {
    it('should accept a valid Redis URL', () => {
      const result = envSchema.parse({
        REDIS_URL: 'redis://localhost:6380',
      });
      expect(result.REDIS_URL).toBe('redis://localhost:6380');
    });

    it('should reject a non-URL string', () => {
      const result = envSchema.safeParse({
        REDIS_URL: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PORT', () => {
    it('should transform a string port to a number', () => {
      const result = envSchema.parse({ PORT: '4000' });
      expect(result.PORT).toBe(4000);
      expect(typeof result.PORT).toBe('number');
    });

    it('should reject a non-numeric string', () => {
      const result = envSchema.safeParse({ PORT: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject negative port numbers', () => {
      const result = envSchema.safeParse({ PORT: '-1' });
      expect(result.success).toBe(false);
    });

    it('should reject zero', () => {
      const result = envSchema.safeParse({ PORT: '0' });
      expect(result.success).toBe(false);
    });

    it('should accept port 8080', () => {
      const result = envSchema.parse({ PORT: '8080' });
      expect(result.PORT).toBe(8080);
    });
  });

  describe('NODE_ENV', () => {
    it('should accept development', () => {
      const result = envSchema.parse({ NODE_ENV: 'development' });
      expect(result.NODE_ENV).toBe('development');
    });

    it('should accept production', () => {
      const result = envSchema.parse({ NODE_ENV: 'production' });
      expect(result.NODE_ENV).toBe('production');
    });

    it('should accept test', () => {
      const result = envSchema.parse({ NODE_ENV: 'test' });
      expect(result.NODE_ENV).toBe('test');
    });

    it('should reject an invalid environment name', () => {
      const result = envSchema.safeParse({ NODE_ENV: 'staging' });
      expect(result.success).toBe(false);
    });
  });

  describe('WEB_URL', () => {
    it('should accept a valid HTTPS URL', () => {
      const result = envSchema.parse({ WEB_URL: 'https://app.savspot.co' });
      expect(result.WEB_URL).toBe('https://app.savspot.co');
    });

    it('should reject a non-URL string', () => {
      const result = envSchema.safeParse({ WEB_URL: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });
});

describe('validateEnv', () => {
  it('should return parsed config for valid inputs', () => {
    const config = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      PORT: '3001',
      NODE_ENV: 'production',
      WEB_URL: 'https://app.savspot.co',
    });
    expect(config.PORT).toBe(3001);
    expect(config.NODE_ENV).toBe('production');
  });

  it('should return defaults when called with empty object', () => {
    const config = validateEnv({});
    expect(config.PORT).toBe(3001);
    expect(config.NODE_ENV).toBe('development');
  });

  it('should throw an error with descriptive message for invalid config', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'not-a-url' }),
    ).toThrow('Environment validation failed');
  });

  it('should throw an error when PORT is not a valid number', () => {
    expect(() =>
      validateEnv({ PORT: 'abc' }),
    ).toThrow('Environment validation failed');
  });

  it('should throw an error when NODE_ENV is invalid', () => {
    expect(() =>
      validateEnv({ NODE_ENV: 'staging' }),
    ).toThrow('Environment validation failed');
  });
});
