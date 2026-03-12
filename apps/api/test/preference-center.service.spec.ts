import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PreferenceCenterService } from '@/communications/preference-center.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const PREF_ID = 'pref-001';
const VALID_TOKEN = 'valid-token';

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeCommunicationsService() {
  return {
    validateUnsubscribeToken: vi.fn(),
  };
}

function makePreference(overrides: Record<string, unknown> = {}) {
  return {
    id: PREF_ID,
    userId: USER_ID,
    preferences: {
      marketingEmails: true,
      bookingReminders: true,
      reviewRequests: true,
      smsNotifications: true,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PreferenceCenterService', () => {
  let service: PreferenceCenterService;
  let prisma: ReturnType<typeof makePrisma>;
  let commsService: ReturnType<typeof makeCommunicationsService>;

  beforeEach(() => {
    prisma = makePrisma();
    commsService = makeCommunicationsService();
    service = new PreferenceCenterService(prisma as never, commsService as never);
  });

  // -----------------------------------------------------------------------
  // getByToken
  // -----------------------------------------------------------------------

  describe('getByToken', () => {
    it('should return user preferences when token is valid', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        name: 'John Doe',
        email: 'john@example.com',
      });
      prisma.notificationPreference.findUnique.mockResolvedValue(makePreference());

      const result = await service.getByToken(VALID_TOKEN);

      expect(result.userName).toBe('John Doe');
      expect(result.preferences).toEqual({
        marketingEmails: true,
        bookingReminders: true,
        reviewRequests: true,
        smsNotifications: true,
      });
    });

    it('should throw NotFoundException when token is invalid', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue(null);

      await expect(service.getByToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getByToken(VALID_TOKEN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return default preferences when no preference record exists', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        name: 'Jane',
        email: 'jane@example.com',
      });
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getByToken(VALID_TOKEN);

      expect(result.preferences).toEqual({
        marketingEmails: true,
        bookingReminders: true,
        reviewRequests: true,
        smsNotifications: true,
      });
    });

    it('should default missing preference keys to true', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        name: 'Jane',
        email: 'jane@example.com',
      });
      prisma.notificationPreference.findUnique.mockResolvedValue(
        makePreference({
          preferences: { marketingEmails: false },
        }),
      );

      const result = await service.getByToken(VALID_TOKEN);

      expect(result.preferences.marketingEmails).toBe(false);
      expect(result.preferences.bookingReminders).toBe(true);
      expect(result.preferences.reviewRequests).toBe(true);
      expect(result.preferences.smsNotifications).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // updateByToken
  // -----------------------------------------------------------------------

  describe('updateByToken', () => {
    it('should update individual preferences', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.notificationPreference.findUnique.mockResolvedValue(makePreference());
      prisma.notificationPreference.update.mockResolvedValue({});

      const result = await service.updateByToken(VALID_TOKEN, {
        marketingEmails: false,
      });

      expect(result.message).toBe('Preferences updated successfully');
      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { id: PREF_ID },
        data: {
          preferences: expect.objectContaining({
            marketingEmails: false,
            bookingReminders: true,
            reviewRequests: true,
            smsNotifications: true,
          }),
        },
      });
    });

    it('should unsubscribe from all when unsubscribeAll is true', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.notificationPreference.findUnique.mockResolvedValue(makePreference());
      prisma.notificationPreference.update.mockResolvedValue({});

      const result = await service.updateByToken(VALID_TOKEN, {
        unsubscribeAll: true,
      });

      expect(result.message).toContain('unsubscribed from all');
      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { id: PREF_ID },
        data: {
          preferences: expect.objectContaining({
            marketingEmails: false,
            bookingReminders: false,
            reviewRequests: false,
            smsNotifications: false,
          }),
        },
      });
    });

    it('should throw NotFoundException when token is invalid', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue(null);

      await expect(
        service.updateByToken('bad-token', { marketingEmails: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no preference record exists', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      await expect(
        service.updateByToken(VALID_TOKEN, { marketingEmails: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only update specified fields and preserve others', async () => {
      commsService.validateUnsubscribeToken.mockReturnValue({ userId: USER_ID });
      prisma.notificationPreference.findUnique.mockResolvedValue(
        makePreference({
          preferences: {
            marketingEmails: true,
            bookingReminders: false,
            reviewRequests: true,
            smsNotifications: true,
          },
        }),
      );
      prisma.notificationPreference.update.mockResolvedValue({});

      await service.updateByToken(VALID_TOKEN, {
        smsNotifications: false,
      });

      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { id: PREF_ID },
        data: {
          preferences: {
            marketingEmails: true,
            bookingReminders: false,
            reviewRequests: true,
            smsNotifications: false,
          },
        },
      });
    });
  });
});
