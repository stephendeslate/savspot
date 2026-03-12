import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeRedis() {
  return {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  };
}

function makeTokenService() {
  return {
    generateAccessToken: vi.fn().mockReturnValue({
      token: 'access-token-abc',
      jti: 'jti-access',
      expiresAt: new Date(),
    }),
    generateRefreshToken: vi.fn().mockReturnValue({
      token: 'refresh-token-xyz',
      jti: 'jti-refresh',
      expiresAt: new Date(),
    }),
    verifyToken: vi.fn(),
    blacklistToken: vi.fn(),
    isBlacklisted: vi.fn(),
  };
}

function makePasswordService() {
  return {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  };
}

function makeEmailService() {
  return {
    generateVerificationToken: vi.fn().mockReturnValue('verification-token'),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    validateVerificationToken: vi.fn(),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'john@example.com',
    name: 'John Doe',
    passwordHash: 'existing-hash',
    role: 'USER',
    emailVerified: true,
    mfaEnabled: false,
    mfaSecret: null,
    mfaRecoveryCodes: null,
    avatarUrl: null,
    googleId: null,
    appleId: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT_ID,
    role: 'OWNER',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let tokenService: ReturnType<typeof makeTokenService>;
  let passwordService: ReturnType<typeof makePasswordService>;
  let emailService: ReturnType<typeof makeEmailService>;

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    tokenService = makeTokenService();
    passwordService = makePasswordService();
    emailService = makeEmailService();
    service = new AuthService(
      prisma as never,
      redis as never,
      tokenService as never,
      passwordService as never,
      emailService as never,
    );
  });

  // -----------------------------------------------------------------------
  // register
  // -----------------------------------------------------------------------

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const created = makeUser();
      prisma.user.create.mockResolvedValue(created);

      const result = await service.register({
        email: 'John@Example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
      } as never);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'john@example.com',
          passwordHash: 'hashed-password',
          name: 'John Doe',
        },
      });
      expect(result.accessToken).toBe('access-token-abc');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(result.user).toBeDefined();
      // passwordHash should be removed from sanitized user
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should lowercase email before checking uniqueness', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser());

      await service.register({
        email: 'UPPER@EXAMPLE.COM',
        password: 'StrongP@ss1',
        firstName: 'Test',
        lastName: 'User',
      } as never);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@example.com' },
      });
    });

    it('should send verification email after creating user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const created = makeUser();
      prisma.user.create.mockResolvedValue(created);

      await service.register({
        email: 'john@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
      } as never);

      expect(emailService.generateVerificationToken).toHaveBeenCalledWith(USER_ID);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        { id: USER_ID, email: 'john@example.com', name: 'John Doe' },
        'verification-token',
      );
    });

    it('should throw ConflictException when email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.register({
          email: 'john@example.com',
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
        } as never),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should trim combined name', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser({ name: 'John' }));

      await service.register({
        email: 'john@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: '',
      } as never);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John',
        }),
      });
    });

    it('should remove sensitive fields from returned user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUser({ mfaSecret: 'secret', mfaRecoveryCodes: ['code1'] }),
      );

      const result = await service.register({
        email: 'john@example.com',
        password: 'pass',
        firstName: 'John',
        lastName: 'Doe',
      } as never);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('mfaSecret');
      expect(result.user).not.toHaveProperty('mfaRecoveryCodes');
    });
  });

  // -----------------------------------------------------------------------
  // validateCredentials
  // -----------------------------------------------------------------------

  describe('validateCredentials', () => {
    it('should return sanitized user when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      passwordService.compare.mockResolvedValue(true);

      const result = await service.validateCredentials('john@example.com', 'correct');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', 'john@example.com');
    });

    it('should return null when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateCredentials('noone@example.com', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when user has no passwordHash (OAuth-only)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: null }));

      const result = await service.validateCredentials('john@example.com', 'pass');

      expect(result).toBeNull();
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      passwordService.compare.mockResolvedValue(false);

      const result = await service.validateCredentials('john@example.com', 'wrong');

      expect(result).toBeNull();
    });

    it('should lowercase email for lookup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.validateCredentials('JOHN@EXAMPLE.COM', 'pass');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // login
  // -----------------------------------------------------------------------

  describe('login', () => {
    it('should return tokens and memberships on successful login', async () => {
      const user = makeUser({
        memberships: [makeMembership()],
      });
      prisma.user.findUnique.mockResolvedValue(user);
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login('john@example.com', 'correct');

      expect(result).toHaveProperty('accessToken', 'access-token-abc');
      expect(result).toHaveProperty('refreshToken', 'refresh-token-xyz');
      expect(result).toHaveProperty('memberships');
      expect((result as unknown as Record<string, unknown[]>)['memberships']).toHaveLength(1);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('noone@example.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: null, memberships: [] }),
      );

      await expect(
        service.login('john@example.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [] }),
      );
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.login('john@example.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when email not verified', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ emailVerified: false, memberships: [] }),
      );
      passwordService.compare.mockResolvedValue(true);

      await expect(
        service.login('john@example.com', 'correct'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return mfaRequired when MFA is enabled', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ mfaEnabled: true, memberships: [] }),
      );
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login('john@example.com', 'correct');

      expect(result).toEqual({
        mfaRequired: true,
        userId: USER_ID,
      });
    });

    it('should include membership in token when user has exactly one', async () => {
      const membership = makeMembership();
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [membership] }),
      );
      passwordService.compare.mockResolvedValue(true);

      await service.login('john@example.com', 'correct');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          tenantRole: 'OWNER',
        }),
      );
    });

    it('should not include membership in token when user has multiple', async () => {
      const memberships = [
        makeMembership(),
        makeMembership({ tenantId: 'tenant-002', role: 'STAFF' }),
      ];
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships }),
      );
      passwordService.compare.mockResolvedValue(true);

      await service.login('john@example.com', 'correct');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: undefined,
          tenantRole: undefined,
        }),
      );
    });

    it('should not include membership in token when user has none', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [] }),
      );
      passwordService.compare.mockResolvedValue(true);

      await service.login('john@example.com', 'correct');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: undefined,
          tenantRole: undefined,
        }),
      );
    });

    it('should lowercase email for lookup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('JOHN@EXAMPLE.COM', 'pass'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'john@example.com' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // logout
  // -----------------------------------------------------------------------

  describe('logout', () => {
    it('should blacklist the token with correct expiration', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.logout('jti-123', exp);

      expect(tokenService.blacklistToken).toHaveBeenCalledWith(
        'jti-123',
        new Date(exp * 1000),
      );
    });
  });

  // -----------------------------------------------------------------------
  // refreshTokens
  // -----------------------------------------------------------------------

  describe('refreshTokens', () => {
    it('should return new tokens on valid refresh', async () => {
      const payload = {
        sub: USER_ID,
        email: 'john@example.com',
        platformRole: 'USER',
        jti: 'old-jti',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      tokenService.verifyToken.mockReturnValue(payload);
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [makeMembership()] }),
      );

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('access-token-abc');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should blacklist old refresh token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: USER_ID,
        email: 'john@example.com',
        platformRole: 'USER',
        jti: 'old-jti',
        type: 'refresh',
        exp,
      };
      tokenService.verifyToken.mockReturnValue(payload);
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [] }),
      );

      await service.refreshTokens('valid-refresh-token');

      expect(tokenService.blacklistToken).toHaveBeenCalledWith(
        'old-jti',
        new Date(exp * 1000),
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      tokenService.verifyToken.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshTokens('bad-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      tokenService.verifyToken.mockReturnValue({
        sub: USER_ID,
        jti: 'jti',
        type: 'access',
        exp: 999,
      });

      await expect(
        service.refreshTokens('access-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      tokenService.verifyToken.mockReturnValue({
        sub: USER_ID,
        jti: 'revoked-jti',
        type: 'refresh',
        exp: 999,
      });
      tokenService.isBlacklisted.mockResolvedValue(true);

      await expect(
        service.refreshTokens('revoked-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      tokenService.verifyToken.mockReturnValue({
        sub: 'nonexistent',
        jti: 'jti',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('valid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use tenantId from payload when present', async () => {
      const payload = {
        sub: USER_ID,
        email: 'john@example.com',
        platformRole: 'USER',
        tenantId: TENANT_ID,
        jti: 'old-jti',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      tokenService.verifyToken.mockReturnValue(payload);
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({
          memberships: [
            makeMembership(),
            makeMembership({ tenantId: 'tenant-002', role: 'STAFF' }),
          ],
        }),
      );

      await service.refreshTokens('valid-refresh-token');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          tenantRole: 'OWNER',
        }),
      );
    });

    it('should use single membership when no tenantId in payload', async () => {
      const payload = {
        sub: USER_ID,
        email: 'john@example.com',
        platformRole: 'USER',
        jti: 'old-jti',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      tokenService.verifyToken.mockReturnValue(payload);
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [makeMembership()] }),
      );

      await service.refreshTokens('valid-refresh-token');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          tenantRole: 'OWNER',
        }),
      );
    });

    it('should not include membership when no tenantId and multiple memberships', async () => {
      const payload = {
        sub: USER_ID,
        email: 'john@example.com',
        platformRole: 'USER',
        jti: 'old-jti',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      tokenService.verifyToken.mockReturnValue(payload);
      tokenService.isBlacklisted.mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({
          memberships: [
            makeMembership(),
            makeMembership({ tenantId: 'tenant-002', role: 'STAFF' }),
          ],
        }),
      );

      await service.refreshTokens('valid-refresh-token');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: undefined,
          tenantRole: undefined,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // verifyEmail
  // -----------------------------------------------------------------------

  describe('verifyEmail', () => {
    it('should mark user emailVerified when token is valid', async () => {
      emailService.validateVerificationToken.mockReturnValue({ userId: USER_ID });
      prisma.user.update.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.verifyEmail('valid-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { emailVerified: true },
      });
    });

    it('should throw BadRequestException when token is invalid', async () => {
      emailService.validateVerificationToken.mockReturnValue(null);

      await expect(
        service.verifyEmail('bad-token'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // forgotPassword
  // -----------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('should store reset token in Redis and send email', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await service.forgotPassword('john@example.com');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^password-reset:/),
        3600,
        USER_ID,
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        { id: USER_ID, email: 'john@example.com', name: 'John Doe' },
        expect.any(String),
      );
    });

    it('should silently return when user not found (prevent enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword('noone@example.com')).resolves.toBeUndefined();

      expect(redis.setex).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should lowercase email for lookup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword('JOHN@EXAMPLE.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // resetPassword
  // -----------------------------------------------------------------------

  describe('resetPassword', () => {
    it('should update password and delete token from Redis', async () => {
      redis.get.mockResolvedValue(USER_ID);
      prisma.user.update.mockResolvedValue(makeUser());

      await service.resetPassword('reset-token-uuid', 'NewP@ss123');

      expect(passwordService.hash).toHaveBeenCalledWith('NewP@ss123');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { passwordHash: 'hashed-password' },
      });
      expect(redis.del).toHaveBeenCalledWith('password-reset:reset-token-uuid');
    });

    it('should throw BadRequestException when token is invalid or expired', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'NewP@ss123'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // changePassword
  // -----------------------------------------------------------------------

  describe('changePassword', () => {
    it('should update password when current password is correct', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      passwordService.compare.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(makeUser());

      await service.changePassword(USER_ID, 'current-pass', 'new-pass');

      expect(passwordService.compare).toHaveBeenCalledWith('current-pass', 'existing-hash');
      expect(passwordService.hash).toHaveBeenCalledWith('new-pass');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { passwordHash: 'hashed-password' },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'pass', 'new-pass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user has no passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: null }));

      await expect(
        service.changePassword(USER_ID, 'pass', 'new-pass'),
      ).rejects.toThrow(BadRequestException);

      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(USER_ID, 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // loginOAuthUser
  // -----------------------------------------------------------------------

  describe('loginOAuthUser', () => {
    it('should return tokens and memberships for OAuth user', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [makeMembership()] }),
      );

      const result = await service.loginOAuthUser(USER_ID);

      expect(result.accessToken).toBe('access-token-abc');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect((result as unknown as Record<string, unknown[]>)['memberships']).toHaveLength(1);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.loginOAuthUser('nonexistent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include membership in token when user has exactly one', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ memberships: [makeMembership()] }),
      );

      await service.loginOAuthUser(USER_ID);

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          tenantRole: 'OWNER',
        }),
      );
    });

    it('should not include membership in token when user has multiple', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({
          memberships: [
            makeMembership(),
            makeMembership({ tenantId: 'tenant-002', role: 'STAFF' }),
          ],
        }),
      );

      await service.loginOAuthUser(USER_ID);

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: undefined,
          tenantRole: undefined,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // validateGoogleUser
  // -----------------------------------------------------------------------

  describe('validateGoogleUser', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'John@Example.com',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should return existing user when found by googleId', async () => {
      const existing = makeUser({ googleId: 'google-123' });
      prisma.user.findUnique.mockResolvedValue(existing);

      const result = await service.validateGoogleUser(googleProfile);

      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      // Only one findUnique call (by googleId)
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should link Google account to existing user found by email', async () => {
      // First call (by googleId) returns null, second (by email) returns existing user
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser({ avatarUrl: null }));
      prisma.user.update.mockResolvedValue(
        makeUser({ googleId: 'google-123', avatarUrl: 'https://example.com/avatar.jpg' }),
      );

      const result = await service.validateGoogleUser(googleProfile);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          googleId: 'google-123',
          emailVerified: true,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should preserve existing avatarUrl when user already has one', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser({ avatarUrl: 'https://existing.com/photo.jpg' }));
      prisma.user.update.mockResolvedValue(
        makeUser({ googleId: 'google-123', avatarUrl: 'https://existing.com/photo.jpg' }),
      );

      await service.validateGoogleUser(googleProfile);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: expect.objectContaining({
          avatarUrl: 'https://existing.com/photo.jpg',
        }),
      });
    });

    it('should create new user when not found by googleId or email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(
        makeUser({ googleId: 'google-123', email: 'john@example.com' }),
      );

      const result = await service.validateGoogleUser(googleProfile);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'john@example.com',
          name: 'John Doe',
          googleId: 'google-123',
          avatarUrl: 'https://example.com/avatar.jpg',
          emailVerified: true,
        },
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should lowercase email when looking up by email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(makeUser());

      await service.validateGoogleUser(googleProfile);

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: 'john@example.com' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // validateAppleUser
  // -----------------------------------------------------------------------

  describe('validateAppleUser', () => {
    const appleProfile = {
      appleId: 'apple-456',
      email: 'John@Example.com',
      name: 'John Doe',
    };

    it('should return existing user when found by appleId', async () => {
      const existing = makeUser({ appleId: 'apple-456' });
      prisma.user.findUnique.mockResolvedValue(existing);

      const result = await service.validateAppleUser(appleProfile);

      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should link Apple account to existing user found by email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser());
      prisma.user.update.mockResolvedValue(
        makeUser({ appleId: 'apple-456' }),
      );

      await service.validateAppleUser(appleProfile);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          appleId: 'apple-456',
          emailVerified: true,
        },
      });
    });

    it('should create new user when not found by appleId or email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(
        makeUser({ appleId: 'apple-456' }),
      );

      await service.validateAppleUser(appleProfile);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'john@example.com',
          name: 'John Doe',
          appleId: 'apple-456',
          emailVerified: true,
        },
      });
    });

    it('should use default name when Apple profile name is empty', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(makeUser({ name: 'Apple User' }));

      await service.validateAppleUser({
        appleId: 'apple-789',
        email: 'anon@example.com',
        name: '',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Apple User',
        }),
      });
    });

    it('should lowercase email when looking up by email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(makeUser());

      await service.validateAppleUser(appleProfile);

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: 'john@example.com' },
      });
    });
  });
});
