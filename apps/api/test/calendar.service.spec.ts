import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// ---------------------------------------------------------------------------
// Mock googleapis before import
// ---------------------------------------------------------------------------

const {
  mockGenerateAuthUrl,
  mockGetToken,
  mockRevokeToken,
  mockSetCredentials,
  mockRefreshAccessToken,
  mockCalendarListList,
  mockEventsInsert,
  mockEventsPatch,
  mockEventsDelete,
  mockEventsList,
  mockEventsWatch,
  mockChannelsStop,
} = vi.hoisted(() => ({
  mockGenerateAuthUrl: vi.fn(),
  mockGetToken: vi.fn(),
  mockRevokeToken: vi.fn(),
  mockSetCredentials: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
  mockCalendarListList: vi.fn(),
  mockEventsInsert: vi.fn(),
  mockEventsPatch: vi.fn(),
  mockEventsDelete: vi.fn(),
  mockEventsList: vi.fn(),
  mockEventsWatch: vi.fn(),
  mockChannelsStop: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        revokeToken: mockRevokeToken,
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      })),
    },
    calendar: vi.fn().mockReturnValue({
      calendarList: { list: mockCalendarListList },
      events: {
        insert: mockEventsInsert,
        patch: mockEventsPatch,
        delete: mockEventsDelete,
        list: mockEventsList,
        watch: mockEventsWatch,
      },
      channels: { stop: mockChannelsStop },
    }),
  },
}));

import * as crypto from 'crypto';
import { GoogleCalendarService } from '@/calendar/calendar.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const CONNECTION_ID = 'conn-001';
const EVENT_ID = 'gcal-event-001';
const CAL_EVENT_ID = 'cal-event-001';

/**
 * Encrypt a token the same way the service does (AES-256-GCM).
 * Uses the same key derivation: SHA-256 of the fallback key.
 */
function encryptTestToken(token: string): string {
  const keySource = 'dev-calendar-encryption-key-change-in-prod';
  const encryptionKey = crypto.createHash('sha256').update(keySource).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function makePrisma() {
  return {
    calendarConnection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendarEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        'googleCalendar.clientId': 'google-client-id',
        'googleCalendar.clientSecret': 'google-client-secret',
        'googleCalendar.redirectUri': 'http://localhost:3001/api/auth/google-calendar/callback',
        'googleCalendar.webhookUrl': 'https://example.com/webhooks/google',
        'jwt.privateKeyBase64': undefined,
      };
      return map[key] ?? fallback;
    }),
  };
}

function makeRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  };
}

function makeQueue() {
  return {
    add: vi.fn(),
    addBulk: vi.fn(),
  };
}

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: CONNECTION_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    provider: 'GOOGLE',
    status: 'ACTIVE',
    accessToken: encryptTestToken('fake-access-token'),
    refreshToken: encryptTestToken('fake-refresh-token'),
    tokenExpiresAt: new Date('2026-12-31'),
    syncCalendars: null,
    icalFeedToken: null,
    lastSyncedAt: null,
    errorMessage: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    const config = makeConfig();
    redis = makeRedis();
    queue = makeQueue();
    service = new GoogleCalendarService(
      prisma as never,
      config as never,
      redis as never,
      queue as never,
    );
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getAuthUrl
  // -------------------------------------------------------------------------

  describe('getAuthUrl', () => {
    it('should call generateAuthUrl with offline access and consent prompt', () => {
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?...');

      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?...');
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
        }),
      );
    });

    it('should encode tenantId and userId in state parameter', () => {
      mockGenerateAuthUrl.mockImplementation((opts: { state: string }) => {
        const decoded = JSON.parse(
          Buffer.from(opts.state, 'base64url').toString('utf8'),
        );
        expect(decoded.tenantId).toBe(TENANT_ID);
        expect(decoded.userId).toBe(USER_ID);
        return 'https://auth-url';
      });

      service.getAuthUrl(TENANT_ID, USER_ID);

      expect(mockGenerateAuthUrl).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // handleCallback
  // -------------------------------------------------------------------------

  describe('handleCallback', () => {
    const validState = Buffer.from(
      JSON.stringify({ tenantId: TENANT_ID, userId: USER_ID }),
    ).toString('base64url');

    it('should throw BadRequestException for invalid state', async () => {
      await expect(
        service.handleCallback('code', '!!!invalid!!!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token exchange fails', async () => {
      mockGetToken.mockRejectedValue(new Error('Invalid code'));

      await expect(
        service.handleCallback('bad-code', validState),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no access_token is returned', async () => {
      mockGetToken.mockResolvedValue({
        tokens: { access_token: null, refresh_token: 'rt' },
      });

      await expect(
        service.handleCallback('code', validState),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new connection when none exists for tenant+user+provider', async () => {
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: 'at-123',
          refresh_token: 'rt-456',
          expiry_date: Date.now() + 3600000,
        },
      });
      mockCalendarListList.mockResolvedValue({
        data: {
          items: [
            { id: 'primary', summary: 'My Calendar', primary: true },
          ],
        },
      });
      prisma.calendarConnection.findFirst.mockResolvedValue(null);
      prisma.calendarConnection.create.mockResolvedValue(
        makeConnection({ id: 'new-conn' }),
      );

      const result = await service.handleCallback('auth-code', validState);

      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.connectionId).toBe('new-conn');
      expect(prisma.calendarConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            provider: 'GOOGLE',
            status: 'ACTIVE',
            syncDirection: 'TWO_WAY',
            syncFrequencyMinutes: 15,
          }),
        }),
      );
    });

    it('should update existing connection when one already exists', async () => {
      mockGetToken.mockResolvedValue({
        tokens: { access_token: 'at-new', refresh_token: 'rt-new', expiry_date: null },
      });
      mockCalendarListList.mockResolvedValue({ data: { items: [] } });
      prisma.calendarConnection.findFirst.mockResolvedValue(makeConnection());
      prisma.calendarConnection.update.mockResolvedValue(makeConnection());

      const result = await service.handleCallback('auth-code', validState);

      expect(result.connectionId).toBe(CONNECTION_ID);
      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTION_ID },
          data: expect.objectContaining({ status: 'ACTIVE', errorMessage: null }),
        }),
      );
    });

    it('should handle calendar list fetch failure gracefully', async () => {
      mockGetToken.mockResolvedValue({
        tokens: { access_token: 'at-123', refresh_token: 'rt-456', expiry_date: null },
      });
      mockCalendarListList.mockRejectedValue(new Error('API error'));
      prisma.calendarConnection.findFirst.mockResolvedValue(null);
      prisma.calendarConnection.create.mockResolvedValue(
        makeConnection({ id: 'new-conn' }),
      );

      // Should not throw
      const result = await service.handleCallback('code', validState);
      expect(result.connectionId).toBe('new-conn');
    });
  });

  // -------------------------------------------------------------------------
  // getConnections
  // -------------------------------------------------------------------------

  describe('getConnections', () => {
    it('should return connections for the given tenant', async () => {
      const conns = [makeConnection()];
      prisma.calendarConnection.findMany.mockResolvedValue(conns);

      const result = await service.getConnections(TENANT_ID);

      expect(result).toBe(conns);
      expect(prisma.calendarConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateConnection
  // -------------------------------------------------------------------------

  describe('updateConnection', () => {
    it('should throw NotFoundException when connection does not exist', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConnection(CONNECTION_ID, { syncFrequencyMinutes: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update sync settings on existing connection', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      prisma.calendarConnection.update.mockResolvedValue(makeConnection());

      await service.updateConnection(CONNECTION_ID, {
        syncFrequencyMinutes: 30,
        syncDirection: 'ONE_WAY',
      });

      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTION_ID },
          data: expect.objectContaining({
            syncFrequencyMinutes: 30,
            syncDirection: 'ONE_WAY',
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // disconnect
  // -------------------------------------------------------------------------

  describe('disconnect', () => {
    it('should throw NotFoundException when connection does not exist', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await expect(service.disconnect(CONNECTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should revoke token, delete events, and delete connection', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockRevokeToken.mockResolvedValue(undefined);
      prisma.calendarEvent.deleteMany.mockResolvedValue({ count: 3 });
      prisma.calendarConnection.delete.mockResolvedValue({});

      await service.disconnect(CONNECTION_ID);

      expect(prisma.calendarEvent.deleteMany).toHaveBeenCalledWith({
        where: { calendarConnectionId: CONNECTION_ID },
      });
      expect(prisma.calendarConnection.delete).toHaveBeenCalledWith({
        where: { id: CONNECTION_ID },
      });
    });

    it('should still delete connection when token revocation fails', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockRevokeToken.mockRejectedValue(new Error('Revoke failed'));
      prisma.calendarEvent.deleteMany.mockResolvedValue({ count: 0 });
      prisma.calendarConnection.delete.mockResolvedValue({});

      // Should not throw
      await service.disconnect(CONNECTION_ID);

      expect(prisma.calendarConnection.delete).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // manualSync
  // -------------------------------------------------------------------------

  describe('manualSync', () => {
    it('should throw NotFoundException when connection does not exist', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await expect(service.manualSync(CONNECTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when connection is not ACTIVE', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ status: 'ERROR' }),
      );

      await expect(service.manualSync(CONNECTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when rate limit (4/hr) is exceeded', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      redis.get.mockResolvedValue('4');

      await expect(service.manualSync(CONNECTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set rate limit counter with 1-hour TTL on first sync', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      redis.get.mockResolvedValue(null);
      queue.add.mockResolvedValue({});

      await service.manualSync(CONNECTION_ID);

      expect(redis.setex).toHaveBeenCalledWith(
        `calendar:manual-sync:${CONNECTION_ID}`,
        3600,
        '1',
      );
    });

    it('should increment rate limit counter on subsequent syncs', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      redis.get.mockResolvedValue('2');
      queue.add.mockResolvedValue({});

      await service.manualSync(CONNECTION_ID);

      expect(redis.set).toHaveBeenCalledWith(
        `calendar:manual-sync:${CONNECTION_ID}`,
        '3',
      );
    });

    it('should enqueue a sync job with manual=true', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      redis.get.mockResolvedValue(null);
      queue.add.mockResolvedValue({});

      await service.manualSync(CONNECTION_ID);

      expect(queue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          connectionId: CONNECTION_ID,
          tenantId: TENANT_ID,
          manual: true,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // createEvent
  // -------------------------------------------------------------------------

  describe('createEvent', () => {
    it('should throw NotFoundException when connection does not exist', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.createEvent(CONNECTION_ID, {
          summary: 'Test',
          startTime: new Date(),
          endTime: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should insert event into Google Calendar and store local record', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsInsert.mockResolvedValue({ data: { id: EVENT_ID } });
      prisma.calendarEvent.create.mockResolvedValue({});

      const start = new Date('2026-03-15T10:00:00Z');
      const end = new Date('2026-03-15T11:00:00Z');

      const result = await service.createEvent(CONNECTION_ID, {
        summary: 'Haircut',
        description: 'Regular haircut',
        startTime: start,
        endTime: end,
        timeZone: 'America/New_York',
      });

      expect(result).toBe(EVENT_ID);
      expect(mockEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          requestBody: expect.objectContaining({
            summary: 'Haircut',
            description: 'Regular haircut',
          }),
        }),
      );
      expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            calendarConnectionId: CONNECTION_ID,
            externalEventId: EVENT_ID,
            direction: 'OUTBOUND',
            title: 'Haircut',
          }),
        }),
      );
    });

    it('should default to UTC timezone when not specified', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsInsert.mockResolvedValue({ data: { id: EVENT_ID } });
      prisma.calendarEvent.create.mockResolvedValue({});

      await service.createEvent(CONNECTION_ID, {
        summary: 'Test',
        startTime: new Date('2026-03-15T10:00:00Z'),
        endTime: new Date('2026-03-15T11:00:00Z'),
      });

      expect(mockEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            start: expect.objectContaining({ timeZone: 'UTC' }),
            end: expect.objectContaining({ timeZone: 'UTC' }),
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateEvent
  // -------------------------------------------------------------------------

  describe('updateEvent', () => {
    it('should patch the Google Calendar event with provided fields', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsPatch.mockResolvedValue({});
      prisma.calendarEvent.findFirst.mockResolvedValue(null);

      await service.updateEvent(CONNECTION_ID, EVENT_ID, {
        summary: 'Updated Haircut',
      });

      expect(mockEventsPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          eventId: EVENT_ID,
          requestBody: expect.objectContaining({
            summary: 'Updated Haircut',
          }),
        }),
      );
    });

    it('should update local CalendarEvent when it exists', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsPatch.mockResolvedValue({});
      prisma.calendarEvent.findFirst.mockResolvedValue({
        id: CAL_EVENT_ID,
        title: 'Old Title',
        startTime: new Date(),
        endTime: new Date(),
      });
      prisma.calendarEvent.update.mockResolvedValue({});

      await service.updateEvent(CONNECTION_ID, EVENT_ID, {
        summary: 'New Title',
      });

      expect(prisma.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CAL_EVENT_ID },
          data: expect.objectContaining({ title: 'New Title' }),
        }),
      );
    });

    it('should skip local update when no matching CalendarEvent exists', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsPatch.mockResolvedValue({});
      prisma.calendarEvent.findFirst.mockResolvedValue(null);

      await service.updateEvent(CONNECTION_ID, EVENT_ID, {
        summary: 'Updated',
      });

      expect(prisma.calendarEvent.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteEvent
  // -------------------------------------------------------------------------

  describe('deleteEvent', () => {
    it('should delete the event from Google Calendar and local DB', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsDelete.mockResolvedValue({});
      prisma.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteEvent(CONNECTION_ID, EVENT_ID);

      expect(mockEventsDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: EVENT_ID,
      });
      expect(prisma.calendarEvent.deleteMany).toHaveBeenCalledWith({
        where: { calendarConnectionId: CONNECTION_ID, externalEventId: EVENT_ID },
      });
    });

    it('should handle 410 Gone gracefully (event already deleted)', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsDelete.mockRejectedValue(new Error('410 Gone'));
      prisma.calendarEvent.deleteMany.mockResolvedValue({ count: 0 });

      // Should not throw
      await service.deleteEvent(CONNECTION_ID, EVENT_ID);

      // Should still clean up local record
      expect(prisma.calendarEvent.deleteMany).toHaveBeenCalled();
    });

    it('should rethrow non-410 errors from Google API', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsDelete.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        service.deleteEvent(CONNECTION_ID, EVENT_ID),
      ).rejects.toThrow('500 Internal Server Error');
    });
  });

  // -------------------------------------------------------------------------
  // setupWatchChannel
  // -------------------------------------------------------------------------

  describe('setupWatchChannel', () => {
    it('should throw BadRequestException when webhook URL not configured', async () => {
      // Create service with no webhookUrl
      const config = {
        get: vi.fn((key: string, fallback?: unknown) => {
          if (key === 'googleCalendar.webhookUrl') return undefined;
          return makeConfig().get(key, fallback);
        }),
      };
      const svc = new GoogleCalendarService(
        prisma as never,
        config as never,
        redis as never,
        queue as never,
      );

      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());

      await expect(svc.setupWatchChannel(CONNECTION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a watch channel and store metadata', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockEventsWatch.mockResolvedValue({
        data: {
          resourceId: 'resource-123',
          expiration: String(Date.now() + 604800000),
        },
      });
      prisma.calendarConnection.update.mockResolvedValue({});

      const result = await service.setupWatchChannel(CONNECTION_ID);

      expect(result.resourceId).toBe('resource-123');
      expect(result.channelId).toBeDefined();
      expect(mockEventsWatch).toHaveBeenCalled();
      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTION_ID },
          data: expect.objectContaining({
            icalFeedToken: expect.stringContaining('channelId'),
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // renewWatchChannels
  // -------------------------------------------------------------------------

  describe('renewWatchChannels', () => {
    it('should return early when connection not found', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await service.renewWatchChannels(CONNECTION_ID);

      expect(mockChannelsStop).not.toHaveBeenCalled();
    });

    it('should return early when connection is not ACTIVE', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ status: 'ERROR' }),
      );

      await service.renewWatchChannels(CONNECTION_ID);

      expect(mockChannelsStop).not.toHaveBeenCalled();
    });

    it('should return early when no watch channel metadata exists', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ icalFeedToken: null }),
      );

      await service.renewWatchChannels(CONNECTION_ID);

      expect(mockChannelsStop).not.toHaveBeenCalled();
    });

    it('should return early when watch channel expiry is far in the future', async () => {
      const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({
          icalFeedToken: JSON.stringify({
            channelId: 'ch-1',
            resourceId: 'res-1',
            calendarId: 'primary',
            expiry: farFuture.toISOString(),
          }),
        }),
      );

      await service.renewWatchChannels(CONNECTION_ID);

      expect(mockChannelsStop).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findConnectionByChannelId
  // -------------------------------------------------------------------------

  describe('findConnectionByChannelId', () => {
    it('should return the connection when $queryRaw finds a match', async () => {
      const conn = makeConnection();
      prisma.$queryRaw.mockResolvedValue([{ id: CONNECTION_ID }]);
      prisma.calendarConnection.findUnique.mockResolvedValue(conn);

      const result = await service.findConnectionByChannelId('ch-match');

      expect(result).toBe(conn);
      expect(prisma.calendarConnection.findUnique).toHaveBeenCalledWith({
        where: { id: CONNECTION_ID },
      });
    });

    it('should return null when $queryRaw returns empty array', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findConnectionByChannelId('ch-nomatch');

      expect(result).toBeNull();
      expect(prisma.calendarConnection.findUnique).not.toHaveBeenCalled();
    });

    it('should delegate JSON filtering to the database via $queryRaw', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.findConnectionByChannelId('ch-test');

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refreshToken
  // -------------------------------------------------------------------------

  describe('refreshToken', () => {
    it('should return early when connection not found', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(null);

      await service.refreshToken(CONNECTION_ID);

      expect(prisma.calendarConnection.update).not.toHaveBeenCalled();
    });

    it('should return early when connection is not ACTIVE', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ status: 'ERROR' }),
      );

      await service.refreshToken(CONNECTION_ID);

      expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it('should mark connection as ERROR when no refresh token exists', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(
        makeConnection({ refreshToken: null }),
      );
      prisma.calendarConnection.update.mockResolvedValue({});

      await service.refreshToken(CONNECTION_ID);

      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ERROR',
            errorMessage: 'No refresh token available',
          }),
        }),
      );
    });

    it('should mark connection as ERROR when refresh fails', async () => {
      prisma.calendarConnection.findUnique.mockResolvedValue(makeConnection());
      mockRefreshAccessToken.mockRejectedValue(
        new Error('Token has been revoked'),
      );
      prisma.calendarConnection.update.mockResolvedValue({});

      await service.refreshToken(CONNECTION_ID);

      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ERROR',
            errorMessage: expect.stringContaining('Token has been revoked'),
          }),
        }),
      );
    });
  });
});
