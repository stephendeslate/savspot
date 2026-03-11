import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationPreferencesService } from '@/notifications/notification-preferences.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationPreferencesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // getPreferences
  // -----------------------------------------------------------------------

  describe('getPreferences', () => {
    it('should return defaults when no preference record exists', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreferences(USER_ID, TENANT_ID);

      expect(result).toEqual({
        userId: USER_ID,
        tenantId: TENANT_ID,
        digestFrequency: 'IMMEDIATE',
        preferences: {},
      });
    });

    it('should return stored preferences when record exists', async () => {
      const prefs = {
        BOOKING: { email: true, sms: false, in_app: true },
      };
      prisma.notificationPreference.findUnique.mockResolvedValue({
        userId: USER_ID,
        digestFrequency: 'DAILY',
        preferences: prefs,
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: 'America/New_York',
      });

      const result = await service.getPreferences(USER_ID, TENANT_ID);

      expect(result.digestFrequency).toBe('DAILY');
      expect(result.preferences).toEqual(prefs);
      expect(result.quietHoursTimezone).toBe('America/New_York');
    });
  });

  // -----------------------------------------------------------------------
  // updatePreferences
  // -----------------------------------------------------------------------

  describe('updatePreferences', () => {
    it('should upsert notification preferences', async () => {
      const prefs = {
        BOOKING: { email: true, sms: false, in_app: true, push: true },
      };
      const updated = {
        id: 'pref-001',
        userId: USER_ID,
        preferences: prefs,
        digestFrequency: 'IMMEDIATE',
      };
      prisma.notificationPreference.upsert.mockResolvedValue(updated);

      const result = await service.updatePreferences(USER_ID, TENANT_ID, prefs);

      expect(result).toEqual(updated);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        update: { preferences: prefs },
        create: { userId: USER_ID, preferences: prefs },
      });
    });
  });

  // -----------------------------------------------------------------------
  // getDigestFrequency
  // -----------------------------------------------------------------------

  describe('getDigestFrequency', () => {
    it('should return IMMEDIATE when no preference exists', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getDigestFrequency(USER_ID);

      expect(result).toEqual({ digestFrequency: 'IMMEDIATE' });
    });

    it('should return stored digest frequency', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        digestFrequency: 'WEEKLY',
      });

      const result = await service.getDigestFrequency(USER_ID);

      expect(result).toEqual({ digestFrequency: 'WEEKLY' });
    });
  });

  // -----------------------------------------------------------------------
  // updateDigestFrequency
  // -----------------------------------------------------------------------

  describe('updateDigestFrequency', () => {
    it('should upsert digest frequency', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-001',
        userId: USER_ID,
        digestFrequency: 'DAILY',
      });

      const result = await service.updateDigestFrequency(USER_ID, 'DAILY');

      expect(result).toEqual({ digestFrequency: 'DAILY' });
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        update: { digestFrequency: 'DAILY' },
        create: { userId: USER_ID, digestFrequency: 'DAILY' },
      });
    });

    it('should handle WEEKLY frequency', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-001',
        userId: USER_ID,
        digestFrequency: 'WEEKLY',
      });

      const result = await service.updateDigestFrequency(USER_ID, 'WEEKLY');

      expect(result).toEqual({ digestFrequency: 'WEEKLY' });
    });
  });
});
