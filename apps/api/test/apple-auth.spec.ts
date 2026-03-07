import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/auth/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APPLE_ID = 'apple-001.abc.def';
const USER_ID = 'user-001';
const EMAIL = 'jane@example.com';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: EMAIL,
    name: 'Jane Doe',
    role: 'USER',
    appleId: APPLE_ID,
    avatarUrl: null,
    passwordHash: 'hashed-pw',
    mfaSecret: null,
    mfaRecoveryCodes: null,
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

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
  return { get: vi.fn(), setex: vi.fn(), del: vi.fn() };
}

function makeTokenService() {
  return {
    generateAccessToken: vi.fn().mockReturnValue({ token: 'access-tok' }),
    generateRefreshToken: vi.fn().mockReturnValue({ token: 'refresh-tok' }),
    verifyToken: vi.fn(),
    blacklistToken: vi.fn(),
    isBlacklisted: vi.fn(),
  };
}

function makePasswordService() {
  return { hash: vi.fn(), compare: vi.fn() };
}

function makeEmailService() {
  return {
    generateVerificationToken: vi.fn(),
    sendVerificationEmail: vi.fn(),
    validateVerificationToken: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthService – validateAppleUser', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const redis = makeRedis();
    const tokenService = makeTokenService();
    const passwordService = makePasswordService();
    const emailService = makeEmailService();
    service = new AuthService(
      prisma as never,
      redis as never,
      tokenService as never,
      passwordService as never,
      emailService as never,
    );
  });

  // -------------------------------------------------------------------------
  // Branch 1: user found by appleId
  // -------------------------------------------------------------------------

  it('returns existing user when found by appleId', async () => {
    const existing = makeUser();
    prisma.user.findUnique.mockResolvedValue(existing);

    const result = await service.validateAppleUser({
      appleId: APPLE_ID,
      email: EMAIL,
      name: 'Jane Doe',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { appleId: APPLE_ID },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    // sanitizeUser strips sensitive fields
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('mfaSecret');
    expect(result).not.toHaveProperty('mfaRecoveryCodes');
    expect(result).toHaveProperty('id', USER_ID);
    expect(result).toHaveProperty('email', EMAIL);
  });

  // -------------------------------------------------------------------------
  // Branch 2: not found by appleId, found by email → link account
  // -------------------------------------------------------------------------

  it('links appleId to existing user found by email', async () => {
    const existingByEmail = makeUser({ appleId: null });
    const updatedUser = makeUser();

    // First call: findUnique by appleId → null
    // Second call: findUnique by email → existing user
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingByEmail);
    prisma.user.update.mockResolvedValue(updatedUser);

    const result = await service.validateAppleUser({
      appleId: APPLE_ID,
      email: EMAIL,
      name: 'Jane Doe',
    });

    // Should look up by appleId first, then by email
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: { appleId: APPLE_ID },
    });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: EMAIL },
    });

    // Should update with appleId and set emailVerified
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        appleId: APPLE_ID,
        emailVerified: true,
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result).toHaveProperty('id', USER_ID);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('lowercases email when looking up by email', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(makeUser({ email: 'mixed@case.com' }));

    await service.validateAppleUser({
      appleId: APPLE_ID,
      email: 'Mixed@Case.COM',
      name: 'Test',
    });

    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: 'mixed@case.com' },
    });
  });

  // -------------------------------------------------------------------------
  // Branch 3: user not found at all → create new user
  // -------------------------------------------------------------------------

  it('creates a new user when not found by appleId or email', async () => {
    const newUser = makeUser();

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(newUser);

    const result = await service.validateAppleUser({
      appleId: APPLE_ID,
      email: EMAIL,
      name: 'Jane Doe',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: EMAIL,
        name: 'Jane Doe',
        appleId: APPLE_ID,
        emailVerified: true,
      },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result).toHaveProperty('id', USER_ID);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('defaults name to "Apple User" when name is empty', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(makeUser({ name: 'Apple User' }));

    await service.validateAppleUser({
      appleId: APPLE_ID,
      email: EMAIL,
      name: '',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: EMAIL,
        name: 'Apple User',
        appleId: APPLE_ID,
        emailVerified: true,
      },
    });
  });

  it('always sets emailVerified to true for new Apple users', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(makeUser());

    await service.validateAppleUser({
      appleId: APPLE_ID,
      email: EMAIL,
      name: 'Jane',
    });

    const createData = prisma.user.create.mock.calls[0]![0].data;
    expect(createData.emailVerified).toBe(true);
  });

  it('lowercases email when creating a new user', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(makeUser({ email: 'upper@test.com' }));

    await service.validateAppleUser({
      appleId: APPLE_ID,
      email: 'UPPER@TEST.COM',
      name: 'Upper',
    });

    const createData = prisma.user.create.mock.calls[0]![0].data;
    expect(createData.email).toBe('upper@test.com');
  });
});
