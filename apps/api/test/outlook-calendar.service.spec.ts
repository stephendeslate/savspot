import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OutlookCalendarService } from '@/calendar/outlook-calendar.service';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const CONNECTION_ID = 'conn-001';
const CLIENT_ID = 'ms-client-id';
const CLIENT_SECRET = 'ms-client-secret';
const REDIRECT_URI = 'http://localhost:3001/api/auth/outlook-calendar/callback';

function makePrisma() {
  return {
    calendarConnection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfig() {
  return {
    get: vi.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        'microsoftCalendar.clientId': CLIENT_ID,
        'microsoftCalendar.clientSecret': CLIENT_SECRET,
        'microsoftCalendar.redirectUri': REDIRECT_URI,
        'jwt.privateKeyBase64': undefined,
      };
      return map[key] ?? fallback;
    }),
  };
}

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: CONNECTION_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    provider: 'MICROSOFT',
    status: 'ACTIVE',
    accessToken: 'encrypted-access',
    refreshToken: 'encrypted-refresh',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('OutlookCalendarService', () => {
  let service: OutlookCalendarService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const config = makeConfig();
    service = new OutlookCalendarService(prisma as never, config as never);
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getAuthUrl
  // -------------------------------------------------------------------------

  describe('getAuthUrl', () => {
    it('should return a URL pointing to Microsoft authorize endpoint', () => {
      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      expect(url).toContain(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      );
    });

    it('should include client_id in the URL', () => {
      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      expect(url).toContain(`client_id=${CLIENT_ID}`);
    });

    it('should include scopes for calendar read/write and offline access', () => {
      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      expect(url).toContain('Calendars.ReadWrite');
      expect(url).toContain('offline_access');
    });

    it('should encode tenantId and userId in state as base64url', () => {
      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state')!;
      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      );

      expect(decoded.tenantId).toBe(TENANT_ID);
      expect(decoded.userId).toBe(USER_ID);
    });

    it('should include prompt=consent to force refresh token', () => {
      const url = service.getAuthUrl(TENANT_ID, USER_ID);

      expect(url).toContain('prompt=consent');
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
        service.handleCallback('auth-code', '!!!invalid!!!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(
        service.handleCallback('bad-code', validState),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no access_token in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: '',
            refresh_token: 'rt',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'Calendars.ReadWrite',
          }),
      });

      await expect(
        service.handleCallback('code', validState),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new connection when none exists', async () => {
      // Token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at-123',
            refresh_token: 'rt-456',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'Calendars.ReadWrite',
          }),
      });
      // Calendar list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            value: [
              { id: 'cal1', name: 'My Calendar', isDefaultCalendar: true },
            ],
          }),
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
            provider: 'MICROSOFT',
            status: 'ACTIVE',
            syncDirection: 'TWO_WAY',
            syncFrequencyMinutes: 15,
          }),
        }),
      );
    });

    it('should update an existing connection when one exists', async () => {
      // Token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at-new',
            refresh_token: 'rt-new',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'Calendars.ReadWrite',
          }),
      });
      // Calendar list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ value: [] }),
      });

      prisma.calendarConnection.findFirst.mockResolvedValue(
        makeConnection(),
      );
      prisma.calendarConnection.update.mockResolvedValue(
        makeConnection(),
      );

      const result = await service.handleCallback('auth-code', validState);

      expect(result.connectionId).toBe(CONNECTION_ID);
      expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTION_ID },
          data: expect.objectContaining({
            status: 'ACTIVE',
            errorMessage: null,
          }),
        }),
      );
    });

    it('should handle calendar list fetch failure gracefully', async () => {
      // Token exchange succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at-123',
            refresh_token: 'rt-456',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'Calendars.ReadWrite',
          }),
      });
      // Calendar list fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      prisma.calendarConnection.findFirst.mockResolvedValue(null);
      prisma.calendarConnection.create.mockResolvedValue(
        makeConnection({ id: 'new-conn' }),
      );

      // Should not throw - calendar list failure is non-fatal
      const result = await service.handleCallback('auth-code', validState);
      expect(result.connectionId).toBe('new-conn');
    });
  });

  // -------------------------------------------------------------------------
  // findConnectionBySubscriptionId
  // -------------------------------------------------------------------------

  describe('findConnectionBySubscriptionId', () => {
    it('should search for MICROSOFT connection with matching webhookChannelId', async () => {
      const conn = makeConnection({ webhookChannelId: 'sub-123' });
      prisma.calendarConnection.findFirst.mockResolvedValue(conn);

      const result = await service.findConnectionBySubscriptionId('sub-123');

      expect(result).toBe(conn);
      expect(prisma.calendarConnection.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'MICROSOFT',
          webhookChannelId: 'sub-123',
          status: 'ACTIVE',
        },
      });
    });

    it('should return null when no matching subscription found', async () => {
      prisma.calendarConnection.findFirst.mockResolvedValue(null);

      const result = await service.findConnectionBySubscriptionId('bad-sub');

      expect(result).toBeNull();
    });
  });
});
