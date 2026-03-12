import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DevicePushTokensService } from '@/device-push-tokens/device-push-tokens.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const TOKEN_ID = 'token-001';

function makePrisma() {
  return {
    devicePushToken: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    id: TOKEN_ID,
    userId: USER_ID,
    token: 'expo-push-token-abc',
    deviceType: 'IOS',
    deviceName: 'iPhone 15',
    isActive: true,
    failureCount: 0,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('DevicePushTokensService', () => {
  let service: DevicePushTokensService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DevicePushTokensService(prisma as never);
  });

  // ---------- register ----------
  describe('register', () => {
    it('should upsert a push token for the user', async () => {
      const created = makeToken();
      prisma.devicePushToken.upsert.mockResolvedValue(created);

      const result = await service.register(USER_ID, {
        token: 'expo-push-token-abc',
        deviceType: 'IOS',
        deviceName: 'iPhone 15',
      });

      expect(result).toEqual(created);
      expect(prisma.devicePushToken.upsert).toHaveBeenCalledWith({
        where: { token: 'expo-push-token-abc' },
        update: {
          userId: USER_ID,
          deviceType: 'IOS',
          deviceName: 'iPhone 15',
          isActive: true,
          failureCount: 0,
        },
        create: {
          userId: USER_ID,
          token: 'expo-push-token-abc',
          deviceType: 'IOS',
          deviceName: 'iPhone 15',
        },
      });
    });

    it('should default deviceName to null when not provided', async () => {
      const created = makeToken({ deviceName: null });
      prisma.devicePushToken.upsert.mockResolvedValue(created);

      await service.register(USER_ID, {
        token: 'expo-push-token-abc',
        deviceType: 'ANDROID',
      });

      expect(prisma.devicePushToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ deviceName: null }),
        }),
      );
    });
  });

  // ---------- update ----------
  describe('update', () => {
    it('should update an existing token owned by the user', async () => {
      const existing = makeToken();
      const updated = makeToken({ isActive: false });
      prisma.devicePushToken.findUnique.mockResolvedValue(existing);
      prisma.devicePushToken.update.mockResolvedValue(updated);

      const result = await service.update(TOKEN_ID, USER_ID, {
        isActive: false,
      });

      expect(result).toEqual(updated);
      expect(prisma.devicePushToken.update).toHaveBeenCalledWith({
        where: { id: TOKEN_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when token does not exist', async () => {
      prisma.devicePushToken.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', USER_ID, { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the token', async () => {
      const existing = makeToken({ userId: OTHER_USER_ID });
      prisma.devicePushToken.findUnique.mockResolvedValue(existing);

      await expect(
        service.update(TOKEN_ID, USER_ID, { isActive: false }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------- remove ----------
  describe('remove', () => {
    it('should delete a token owned by the user', async () => {
      const existing = makeToken();
      prisma.devicePushToken.findUnique.mockResolvedValue(existing);
      prisma.devicePushToken.delete.mockResolvedValue(existing);

      const result = await service.remove(TOKEN_ID, USER_ID);

      expect(result).toEqual({ deleted: true });
      expect(prisma.devicePushToken.delete).toHaveBeenCalledWith({
        where: { id: TOKEN_ID },
      });
    });

    it('should throw NotFoundException when token does not exist', async () => {
      prisma.devicePushToken.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the token', async () => {
      const existing = makeToken({ userId: OTHER_USER_ID });
      prisma.devicePushToken.findUnique.mockResolvedValue(existing);

      await expect(service.remove(TOKEN_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
