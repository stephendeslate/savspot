import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

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

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'jane@example.com',
    name: 'Jane Doe',
    avatarUrl: null,
    passwordHash: 'hashed-pw-secret',
    mfaSecret: 'mfa-secret-123',
    mfaRecoveryCodes: ['code1', 'code2'],
    memberships: [],
    ...overrides,
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

  // ---------- findById ----------

  describe('findById', () => {
    it('should return user without sensitive fields', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findById(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe('jane@example.com');
      expect((result as Record<string, unknown>)['passwordHash']).toBeUndefined();
      expect((result as Record<string, unknown>)['mfaSecret']).toBeUndefined();
      expect((result as Record<string, unknown>)['mfaRecoveryCodes']).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include memberships with tenant info', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await service.findById(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            memberships: {
              select: {
                tenantId: true,
                role: true,
                tenant: {
                  select: { id: true, name: true, slug: true, logoUrl: true, status: true },
                },
              },
            },
          },
        }),
      );
    });
  });

  // ---------- findByEmail ----------

  describe('findByEmail', () => {
    it('should look up user by lowercased email', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await service.findByEmail('Jane@Example.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('should update user and strip sensitive fields from result', async () => {
      prisma.user.update.mockResolvedValue(
        makeUser({ name: 'Jane Updated' }),
      );

      const result = await service.update(USER_ID, { name: 'Jane Updated' } as never);

      expect(result.name).toBe('Jane Updated');
      expect((result as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });
  });

  // ---------- getNotificationPreferences ----------

  describe('getNotificationPreferences', () => {
    it('should return existing preferences', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        userId: USER_ID,
        preferences: { booking: { email: true } },
      });

      const result = await service.getNotificationPreferences(USER_ID);

      expect(result.preferences).toEqual({ booking: { email: true } });
    });

    it('should return default when no preferences exist', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getNotificationPreferences(USER_ID);

      expect(result).toEqual({ preferences: null });
    });
  });

  // ---------- updateNotificationPreferences ----------

  describe('updateNotificationPreferences', () => {
    it('should upsert notification preferences', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        userId: USER_ID,
        preferences: { booking: { email: false } },
      });

      const prefs = { booking: { email: false } };
      await service.updateNotificationPreferences(USER_ID, prefs);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: { userId: USER_ID, preferences: prefs },
        update: { preferences: prefs },
      });
    });
  });
});
