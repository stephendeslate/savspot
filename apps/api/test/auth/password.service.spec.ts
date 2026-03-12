import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordService } from '@/auth/services/password.service';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hash', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await service.hash('password123');

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('password123');
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await service.hash('password123');
      const hash2 = await service.hash('password123');

      expect(hash1).not.toBe(hash2); // different salts
    });
  });

  describe('compare', () => {
    it('should return true when password matches hash', async () => {
      const hash = await service.hash('secret');

      const result = await service.compare('secret', hash);

      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      const hash = await service.hash('secret');

      const result = await service.compare('wrong', hash);

      expect(result).toBe(false);
    });
  });
});
