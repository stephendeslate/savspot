import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'jane@example.com',
    name: 'Jane Doe',
    role: 'USER',
    avatarUrl: null,
    passwordHash: 'hashed-pw',
    mfaSecret: 'secret-123',
    mfaRecoveryCodes: ['code1', 'code2'],
    emailVerified: true,
    googleId: null,
    appleId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    memberships: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UsersService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // getNotificationPreferences
  // -------------------------------------------------------------------------

  describe('getNotificationPreferences', () => {
    it('returns existing preferences when found', async () => {
      const prefs = {
        id: 'pref-001',
        userId: USER_ID,
        preferences: { email: true, sms: false, push: true },
      };
      prisma.notificationPreference.findUnique.mockResolvedValue(prefs);

      const result = await service.getNotificationPreferences(USER_ID);

      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(result).toEqual(prefs);
    });

    it('returns { preferences: null } when no record exists', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getNotificationPreferences(USER_ID);

      expect(result).toEqual({ preferences: null });
    });
  });

  // -------------------------------------------------------------------------
  // updateNotificationPreferences
  // -------------------------------------------------------------------------

  describe('updateNotificationPreferences', () => {
    it('upserts preference record with given preferences', async () => {
      const preferences = { email: true, sms: false, push: true };
      const upserted = {
        id: 'pref-001',
        userId: USER_ID,
        preferences,
      };
      prisma.notificationPreference.upsert.mockResolvedValue(upserted);

      const result = await service.updateNotificationPreferences(USER_ID, preferences);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: {
          userId: USER_ID,
          preferences: preferences as object,
        },
        update: {
          preferences: preferences as object,
        },
      });
      expect(result).toEqual(upserted);
    });

    it('creates record when user has no existing preferences', async () => {
      const preferences = { bookingConfirmation: true, reminderHours: 24 };
      const created = { id: 'pref-002', userId: USER_ID, preferences };
      prisma.notificationPreference.upsert.mockResolvedValue(created);

      const result = await service.updateNotificationPreferences(USER_ID, preferences);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('updates record when user already has preferences', async () => {
      const preferences = { email: false };
      const updated = { id: 'pref-001', userId: USER_ID, preferences };
      prisma.notificationPreference.upsert.mockResolvedValue(updated);

      const result = await service.updateNotificationPreferences(USER_ID, preferences);

      expect(result.preferences).toEqual({ email: false });
    });
  });

  // -------------------------------------------------------------------------
  // sanitizeUser (tested indirectly via findById and update)
  // -------------------------------------------------------------------------

  describe('sanitizeUser', () => {
    it('strips passwordHash from returned user via findById', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findById(USER_ID);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', USER_ID);
      expect(result).toHaveProperty('email', 'jane@example.com');
    });

    it('strips mfaSecret from returned user via findById', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findById(USER_ID);

      expect(result).not.toHaveProperty('mfaSecret');
    });

    it('strips mfaRecoveryCodes from returned user via findById', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findById(USER_ID);

      expect(result).not.toHaveProperty('mfaRecoveryCodes');
    });

    it('strips sensitive fields from returned user via update', async () => {
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.update(USER_ID, { name: 'New Name' } as never);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('mfaSecret');
      expect(result).not.toHaveProperty('mfaRecoveryCodes');
      expect(result).toHaveProperty('name', 'Jane Doe');
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
