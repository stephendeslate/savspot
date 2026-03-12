import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserPushService } from '@/browser-push/browser-push.service';

// Mock web-push module
vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
  WebPushError: class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import * as webPush from 'web-push';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const SUB_ID = 'sub-001';

function makePrisma() {
  return {
    browserPushSubscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenantMembership: {
      findMany: vi.fn(),
    },
  };
}

function makeConfigService(vapidKeys = true) {
  return {
    get: vi.fn((key: string, defaultVal?: string) => {
      if (key === 'vapid.publicKey') return vapidKeys ? 'pub-key' : undefined;
      if (key === 'vapid.privateKey') return vapidKeys ? 'priv-key' : undefined;
      if (key === 'vapid.subject') return defaultVal;
      return defaultVal;
    }),
  };
}

function makeRedisService() {
  return {
    get: vi.fn(),
    setex: vi.fn(),
  };
}

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: SUB_ID,
    userId: USER_ID,
    tenantId: TENANT_ID,
    endpoint: 'https://push.example.com/sub1',
    p256dh: 'p256dh-key',
    auth: 'auth-key',
    lastUsedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BrowserPushService', () => {
  let service: BrowserPushService;
  let prisma: ReturnType<typeof makePrisma>;
  let config: ReturnType<typeof makeConfigService>;
  let redis: ReturnType<typeof makeRedisService>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    config = makeConfigService();
    redis = makeRedisService();
    service = new BrowserPushService(
      prisma as never,
      config as never,
      redis as never,
    );
  });

  // -------------------------------------------------------------------------
  // constructor / isConfigured
  // -------------------------------------------------------------------------

  describe('initialization', () => {
    it('should set VAPID details when keys are provided', () => {
      expect(webPush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:support@savspot.co',
        'pub-key',
        'priv-key',
      );
    });

    it('should enter no-op mode when VAPID keys are missing', () => {
      vi.clearAllMocks();
      const noKeyConfig = makeConfigService(false);
      const _noOpService = new BrowserPushService(
        prisma as never,
        noKeyConfig as never,
        redis as never,
      );

      // setVapidDetails should NOT be called this time
      expect(webPush.setVapidDetails).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // subscribe
  // -------------------------------------------------------------------------

  describe('subscribe', () => {
    it('should create new subscription when none exists', async () => {
      prisma.browserPushSubscription.findFirst.mockResolvedValue(null);
      const created = makeSubscription();
      prisma.browserPushSubscription.create.mockResolvedValue(created);

      const result = await service.subscribe(USER_ID, TENANT_ID, {
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      });

      expect(result.id).toBe(SUB_ID);
      expect(prisma.browserPushSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          tenantId: TENANT_ID,
          endpoint: 'https://push.example.com/sub1',
        }),
      });
    });

    it('should update existing subscription with same endpoint', async () => {
      prisma.browserPushSubscription.findFirst.mockResolvedValue(
        makeSubscription(),
      );
      prisma.browserPushSubscription.update.mockResolvedValue(
        makeSubscription(),
      );

      await service.subscribe(USER_ID, TENANT_ID, {
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
      });

      expect(prisma.browserPushSubscription.update).toHaveBeenCalledWith({
        where: { id: SUB_ID },
        data: expect.objectContaining({
          p256dh: 'new-p256dh',
          auth: 'new-auth',
        }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // unsubscribe
  // -------------------------------------------------------------------------

  describe('unsubscribe', () => {
    it('should delete subscription by ID', async () => {
      prisma.browserPushSubscription.delete.mockResolvedValue({});

      await service.unsubscribe(SUB_ID);

      expect(prisma.browserPushSubscription.delete).toHaveBeenCalledWith({
        where: { id: SUB_ID },
      });
    });
  });

  // -------------------------------------------------------------------------
  // sendToUser
  // -------------------------------------------------------------------------

  describe('sendToUser', () => {
    const payload = { title: 'Test', body: 'Hello' };

    it('should return 0 in no-op mode', async () => {
      const noKeyConfig = makeConfigService(false);
      const noOpService = new BrowserPushService(
        prisma as never,
        noKeyConfig as never,
        redis as never,
      );

      const result = await noOpService.sendToUser(USER_ID, TENANT_ID, payload);

      expect(result).toBe(0);
    });

    it('should return 0 when rate limit exceeded', async () => {
      redis.get.mockResolvedValue('5'); // MAX_PUSHES_PER_HOUR = 5

      const result = await service.sendToUser(USER_ID, TENANT_ID, payload);

      expect(result).toBe(0);
      expect(webPush.sendNotification).not.toHaveBeenCalled();
    });

    it('should return 0 when no subscriptions exist', async () => {
      redis.get.mockResolvedValue(null);
      prisma.browserPushSubscription.findMany.mockResolvedValue([]);

      const result = await service.sendToUser(USER_ID, TENANT_ID, payload);

      expect(result).toBe(0);
    });

    it('should send push to all subscriptions and update lastUsedAt', async () => {
      redis.get.mockResolvedValue(null);
      prisma.browserPushSubscription.findMany.mockResolvedValue([
        makeSubscription(),
      ]);
      vi.mocked(webPush.sendNotification).mockResolvedValue({} as never);
      prisma.browserPushSubscription.update.mockResolvedValue({});

      const result = await service.sendToUser(USER_ID, TENANT_ID, payload);

      expect(result).toBe(1);
      expect(webPush.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://push.example.com/sub1',
        }),
        expect.any(String),
      );
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should remove subscription on 410 Gone', async () => {
      redis.get.mockResolvedValue(null);
      prisma.browserPushSubscription.findMany.mockResolvedValue([
        makeSubscription(),
      ]);
      const err = new (webPush as unknown as { WebPushError: new (msg: string, code: number) => Error }).WebPushError('Gone', 410);
      vi.mocked(webPush.sendNotification).mockRejectedValue(err);
      prisma.browserPushSubscription.delete.mockResolvedValue({});

      const result = await service.sendToUser(USER_ID, TENANT_ID, payload);

      expect(result).toBe(0);
      expect(prisma.browserPushSubscription.delete).toHaveBeenCalledWith({
        where: { id: SUB_ID },
      });
    });

    it('should increment existing rate limit counter', async () => {
      redis.get.mockResolvedValue('2');
      prisma.browserPushSubscription.findMany.mockResolvedValue([
        makeSubscription(),
      ]);
      vi.mocked(webPush.sendNotification).mockResolvedValue({} as never);
      prisma.browserPushSubscription.update.mockResolvedValue({});

      await service.sendToUser(USER_ID, TENANT_ID, payload);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('push:ratelimit:'),
        3600,
        '3', // 2 + 1
      );
    });
  });

  // -------------------------------------------------------------------------
  // sendToTenantAdmins
  // -------------------------------------------------------------------------

  describe('sendToTenantAdmins', () => {
    const payload = { title: 'Admin Alert', body: 'Something happened' };

    it('should return 0 in no-op mode', async () => {
      const noKeyConfig = makeConfigService(false);
      const noOpService = new BrowserPushService(
        prisma as never,
        noKeyConfig as never,
        redis as never,
      );

      const result = await noOpService.sendToTenantAdmins(TENANT_ID, payload);

      expect(result).toBe(0);
    });

    it('should return 0 when no admin members exist', async () => {
      prisma.tenantMembership.findMany.mockResolvedValue([]);

      const result = await service.sendToTenantAdmins(TENANT_ID, payload);

      expect(result).toBe(0);
    });

    it('should send to all admin members', async () => {
      prisma.tenantMembership.findMany.mockResolvedValue([
        { userId: 'admin-1' },
        { userId: 'admin-2' },
      ]);
      // Mock sendToUser behavior through prisma calls
      redis.get.mockResolvedValue(null);
      prisma.browserPushSubscription.findMany.mockResolvedValue([
        makeSubscription(),
      ]);
      vi.mocked(webPush.sendNotification).mockResolvedValue({} as never);
      prisma.browserPushSubscription.update.mockResolvedValue({});

      const result = await service.sendToTenantAdmins(TENANT_ID, payload);

      expect(result).toBe(2);
      expect(prisma.tenantMembership.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { userId: true },
      });
    });
  });
});
