import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { google, calendar_v3 } from 'googleapis';

/** OAuth2Client type extracted from googleapis */
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JobDispatcher } from '../bullmq/job-dispatcher.service';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_TWO_WAY_SYNC,
} from '../bullmq/queue.constants';

/**
 * Google Calendar integration service.
 * Handles OAuth flow, CRUD on calendar events, incremental sync,
 * watch channels for push notifications, and token lifecycle.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly webhookUrl: string | undefined;
  private readonly encryptionKey: Buffer;
  private readonly stateHmacKey: Buffer;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly dispatcher: JobDispatcher,
  ) {
    this.clientId = this.configService.get<string>(
      'googleCalendar.clientId',
      '',
    );
    this.clientSecret = this.configService.get<string>(
      'googleCalendar.clientSecret',
      '',
    );
    this.redirectUri = this.configService.get<string>(
      'googleCalendar.redirectUri',
      'http://localhost:3001/api/auth/google-calendar/callback',
    );
    this.webhookUrl = this.configService.get<string>(
      'googleCalendar.webhookUrl',
    );

    // Derive AES-256 encryption key from JWT private key
    const jwtKey = this.configService.get<string>('jwt.privateKeyBase64');
    if (!jwtKey) {
      this.logger.warn(
        'jwt.privateKeyBase64 not set — calendar encryption will use a non-persistent key. Set JWT_PRIVATE_KEY_BASE64 for production.',
      );
    }
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(jwtKey || crypto.randomBytes(32).toString('hex'))
      .digest();

    this.stateHmacKey = crypto
      .createHash('sha256')
      .update(this.encryptionKey)
      .update('oauth-state')
      .digest();
  }

  // ---------------------------------------------------------------------------
  // OAuth Flow
  // ---------------------------------------------------------------------------

  /**
   * Generates a Google OAuth2 authorization URL for calendar access.
   * State param encodes tenantId + userId for the callback.
   */
  getAuthUrl(tenantId: string, userId: string): string {
    const oauth2Client = this.createOAuth2Client();

    const state = this.createSignedState({ tenantId, userId });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      state,
      prompt: 'consent', // Force consent to always get refresh_token
    });

    return authUrl;
  }

  /**
   * Handles the OAuth callback: exchanges code for tokens,
   * creates CalendarConnection, fetches available calendars.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ tenantId: string; connectionId: string }> {
    const { tenantId, userId } = this.verifySignedState<{ tenantId: string; userId: string }>(state);

    // Exchange code for tokens
    const oauth2Client = this.createOAuth2Client();
    let tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };
    try {
      const { tokens: t } = await oauth2Client.getToken(code);
      tokens = t;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to exchange auth code: ${message}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }

    if (!tokens.access_token) {
      throw new BadRequestException('No access token received from Google');
    }

    // Encrypt tokens
    const encryptedAccess = this.encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? this.encryptToken(tokens.refresh_token)
      : null;

    // Fetch calendar list for syncCalendars default
    oauth2Client.setCredentials(tokens);
    let syncCalendars: Prisma.InputJsonValue = [];
    try {
      const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
      const listRes = await calendarApi.calendarList.list();
      syncCalendars = (listRes.data.items || []).map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
      })) as unknown as Prisma.InputJsonValue;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Failed to fetch calendar list: ${message}`);
    }

    // Upsert CalendarConnection — one per tenant+user+provider
    const existing = await this.prisma.calendarConnection.findFirst({
      where: { tenantId, userId, provider: 'GOOGLE' },
    });

    let connection;
    if (existing) {
      connection = await this.prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
          status: 'ACTIVE',
          errorMessage: null,
          syncCalendars,
        },
      });
    } else {
      connection = await this.prisma.calendarConnection.create({
        data: {
          tenantId,
          userId,
          provider: 'GOOGLE',
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
          status: 'ACTIVE',
          syncDirection: 'TWO_WAY',
          syncFrequencyMinutes: 15,
          syncCalendars,
        },
      });
    }

    this.logger.log(
      `Calendar connection ${existing ? 'updated' : 'created'}: ${connection.id} for tenant ${tenantId}`,
    );

    return { tenantId, connectionId: connection.id };
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * List all calendar connections for a tenant.
   */
  async getConnections(tenantId: string) {
    return this.prisma.calendarConnection.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        syncDirection: true,
        syncFrequencyMinutes: true,
        syncCalendars: true,
        lastSyncedAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch available calendars from Google for a specific connection.
   */
  async getAvailableCalendars(connectionId: string) {
    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);

    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendarApi.calendarList.list();

    return (res.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole,
    }));
  }

  /**
   * Update sync settings for a connection.
   */
  async updateConnection(
    connectionId: string,
    data: {
      syncFrequencyMinutes?: number;
      syncCalendars?: string[];
      syncDirection?: 'ONE_WAY' | 'TWO_WAY';
    },
  ) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Calendar connection not found');
    }

    return this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        syncFrequencyMinutes: data.syncFrequencyMinutes,
        syncCalendars: data.syncCalendars
          ? (data.syncCalendars as unknown as Prisma.InputJsonValue)
          : undefined,
        syncDirection: data.syncDirection,
      },
    });
  }

  /**
   * Disconnect a calendar connection: revoke token, teardown watches, delete record.
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Calendar connection not found');
    }

    // Attempt to revoke the Google token
    try {
      const accessToken = this.decryptToken(connection.accessToken);
      const oauth2Client = this.createOAuth2Client();
      await oauth2Client.revokeToken(accessToken);
      this.logger.log(`Google token revoked for connection ${connectionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(
        `Failed to revoke Google token for connection ${connectionId}: ${message}`,
      );
    }

    // Delete associated calendar events
    await this.prisma.calendarEvent.deleteMany({
      where: { calendarConnectionId: connectionId },
    });

    // Delete the connection
    await this.prisma.calendarConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(`Calendar connection ${connectionId} disconnected and deleted`);
  }

  // ---------------------------------------------------------------------------
  // Manual Sync (Rate-Limited)
  // ---------------------------------------------------------------------------

  /**
   * Trigger an immediate sync, rate-limited to 4 per hour via Redis.
   */
  async manualSync(connectionId: string): Promise<void> {
    const connection = await this.getActiveConnection(connectionId);

    // Rate limit: 4 syncs per hour per connection
    const rateLimitKey = `calendar:manual-sync:${connectionId}`;
    const currentCount = await this.redisService.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= 4) {
      throw new BadRequestException(
        'Manual sync rate limit exceeded (max 4 per hour). Please wait before trying again.',
      );
    }

    // Increment counter with 1-hour TTL
    if (count === 0) {
      await this.redisService.setex(rateLimitKey, 3600, '1');
    } else {
      await this.redisService.set(rateLimitKey, String(count + 1));
    }

    // Enqueue sync job (routes to BullMQ or Inngest per QUEUE_CALENDAR_PROVIDER)
    await this.dispatcher.dispatch(QUEUE_CALENDAR, JOB_CALENDAR_TWO_WAY_SYNC, {
      connectionId: connection.id,
      tenantId: connection.tenantId,
      manual: true,
    });

    this.logger.log(`Manual sync enqueued for connection ${connectionId}`);
  }

  // ---------------------------------------------------------------------------
  // Calendar Event CRUD
  // ---------------------------------------------------------------------------

  /**
   * Creates a Google Calendar event and stores the CalendarEvent record.
   */
  async createEvent(
    connectionId: string,
    eventData: {
      summary: string;
      description?: string;
      location?: string;
      startTime: Date;
      endTime: Date;
      timeZone?: string;
    },
  ): Promise<string> {
    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeZone = eventData.timeZone || 'UTC';

    const event: calendar_v3.Schema$Event = {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone,
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone,
      },
    };

    const res = await calendarApi.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    const externalEventId = res.data.id!;

    // Store CalendarEvent record
    await this.prisma.calendarEvent.create({
      data: {
        tenantId: connection.tenantId,
        calendarConnectionId: connectionId,
        externalEventId,
        direction: 'OUTBOUND',
        title: eventData.summary,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        syncedAt: new Date(),
      },
    });

    this.logger.log(
      `Created Google Calendar event ${externalEventId} for connection ${connectionId}`,
    );

    return externalEventId;
  }

  /**
   * Updates an existing Google Calendar event.
   */
  async updateEvent(
    connectionId: string,
    externalEventId: string,
    eventData: {
      summary?: string;
      description?: string;
      location?: string;
      startTime?: Date;
      endTime?: Date;
      timeZone?: string;
    },
  ): Promise<void> {
    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeZone = eventData.timeZone || 'UTC';

    const patch: calendar_v3.Schema$Event = {};
    if (eventData.summary !== undefined) patch.summary = eventData.summary;
    if (eventData.description !== undefined) patch.description = eventData.description;
    if (eventData.location !== undefined) patch.location = eventData.location;
    if (eventData.startTime) {
      patch.start = {
        dateTime: eventData.startTime.toISOString(),
        timeZone,
      };
    }
    if (eventData.endTime) {
      patch.end = {
        dateTime: eventData.endTime.toISOString(),
        timeZone,
      };
    }

    await calendarApi.events.patch({
      calendarId: 'primary',
      eventId: externalEventId,
      requestBody: patch,
    });

    // Update local CalendarEvent record
    const calEvent = await this.prisma.calendarEvent.findFirst({
      where: { calendarConnectionId: connectionId, externalEventId },
    });

    if (calEvent) {
      await this.prisma.calendarEvent.update({
        where: { id: calEvent.id },
        data: {
          title: eventData.summary ?? calEvent.title,
          startTime: eventData.startTime ?? calEvent.startTime,
          endTime: eventData.endTime ?? calEvent.endTime,
          syncedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Updated Google Calendar event ${externalEventId} for connection ${connectionId}`,
    );
  }

  /**
   * Deletes a Google Calendar event.
   */
  async deleteEvent(
    connectionId: string,
    externalEventId: string,
  ): Promise<void> {
    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      await calendarApi.events.delete({
        calendarId: 'primary',
        eventId: externalEventId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // 410 Gone = already deleted — not an error
      if (message.includes('410') || message.includes('Gone')) {
        this.logger.warn(
          `Google Calendar event ${externalEventId} already deleted (410)`,
        );
      } else {
        throw err;
      }
    }

    // Delete local CalendarEvent record
    await this.prisma.calendarEvent.deleteMany({
      where: { calendarConnectionId: connectionId, externalEventId },
    });

    this.logger.log(
      `Deleted Google Calendar event ${externalEventId} for connection ${connectionId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Inbound Sync (Incremental)
  // ---------------------------------------------------------------------------

  /**
   * Fetches events from Google Calendar using incremental sync (syncToken).
   * Creates/updates/deletes CalendarEvent records with direction=INBOUND.
   */
  async syncInboundEvents(
    connectionId: string,
  ): Promise<{ added: number; updated: number; deleted: number }> {
    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    // Determine which calendars to sync
    const syncCalendars = this.getSyncCalendarIds(connection);
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;

    for (const calendarId of syncCalendars) {
      const result = await this.syncCalendarEvents(
        calendarApi,
        connection,
        calendarId,
      );
      totalAdded += result.added;
      totalUpdated += result.updated;
      totalDeleted += result.deleted;
    }

    // Update last synced timestamp
    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(
      `Sync complete for connection ${connectionId}: +${totalAdded} ~${totalUpdated} -${totalDeleted}`,
    );

    return { added: totalAdded, updated: totalUpdated, deleted: totalDeleted };
  }

  // ---------------------------------------------------------------------------
  // Watch Channels (Push Notifications)
  // ---------------------------------------------------------------------------

  /**
   * Sets up a watch channel for push notifications on a Google Calendar.
   */
  async setupWatchChannel(
    connectionId: string,
    calendarId: string = 'primary',
  ): Promise<{ channelId: string; resourceId: string; expiration: string }> {
    if (!this.webhookUrl) {
      throw new BadRequestException(
        'GOOGLE_CALENDAR_WEBHOOK_URL not configured — cannot set up watch channels',
      );
    }

    const connection = await this.getActiveConnection(connectionId);
    const oauth2Client = await this.getAuthenticatedClient(connection);
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    const channelId = crypto.randomUUID();
    const watchRes = await calendarApi.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: this.webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const resourceId = watchRes.data.resourceId!;
    const expiration = watchRes.data.expiration!;

    // Store watch metadata as JSON on the connection
    // Using icalFeedToken field isn't ideal, so we store watch info
    // We update the connection to track channel info
    const watchMeta = {
      channelId,
      resourceId,
      calendarId,
      expiry: new Date(parseInt(expiration, 10)).toISOString(),
    };

    // Store watch metadata in connection's syncCalendars alongside calendar list
    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        // We reuse the icalFeedToken field to store serialized watch channel info
        // In a future migration, dedicated columns would be better
        icalFeedToken: JSON.stringify(watchMeta),
      },
    });

    this.logger.log(
      `Watch channel ${channelId} set up for connection ${connectionId}, calendar ${calendarId}`,
    );

    return {
      channelId,
      resourceId,
      expiration: new Date(parseInt(expiration, 10)).toISOString(),
    };
  }

  /**
   * Renews watch channels that are expiring within the given threshold.
   */
  async renewWatchChannels(connectionId: string): Promise<void> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'ACTIVE') {
      return;
    }

    if (!connection.icalFeedToken) {
      return; // No watch channel set up
    }

    let watchMeta: { channelId: string; resourceId: string; calendarId: string; expiry: string };
    try {
      watchMeta = JSON.parse(connection.icalFeedToken);
    } catch {
      return; // Invalid watch metadata
    }

    const expiry = new Date(watchMeta.expiry);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (expiry > sevenDaysFromNow) {
      return; // Not expiring soon
    }

    // Stop the old channel first
    try {
      const oauth2Client = await this.getAuthenticatedClient(connection);
      const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendarApi.channels.stop({
        requestBody: {
          id: watchMeta.channelId,
          resourceId: watchMeta.resourceId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Failed to stop old watch channel: ${message}`);
    }

    // Set up a new channel
    await this.setupWatchChannel(connectionId, watchMeta.calendarId);
    this.logger.log(`Watch channel renewed for connection ${connectionId}`);
  }

  /**
   * Find a connection by its watch channel ID (used by webhook handler).
   */
  async findConnectionByChannelId(channelId: string) {
    const connections = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM calendar_connections
      WHERE status = 'ACTIVE'
        AND ical_feed_token IS NOT NULL
        AND pg_input_is_valid(ical_feed_token, 'jsonb')
        AND ical_feed_token::jsonb->>'channelId' = ${channelId}
      LIMIT 1
    `;

    if (connections.length === 0) return null;

    return this.prisma.calendarConnection.findUnique({
      where: { id: connections[0]!.id },
    });
  }

  // ---------------------------------------------------------------------------
  // Token Refresh
  // ---------------------------------------------------------------------------

  /**
   * Refreshes the access token using the stored refresh token.
   * Sets connection status to ERROR if refresh fails.
   */
  async refreshToken(connectionId: string): Promise<void> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'ACTIVE') {
      return;
    }

    if (!connection.refreshToken) {
      this.logger.warn(
        `Connection ${connectionId} has no refresh token — marking as ERROR`,
      );
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          status: 'ERROR',
          errorMessage: 'No refresh token available',
        },
      });
      return;
    }

    try {
      const oauth2Client = this.createOAuth2Client();
      const refreshToken = this.decryptToken(connection.refreshToken);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token returned from refresh');
      }

      const encryptedAccess = this.encryptToken(credentials.access_token);

      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: encryptedAccess,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
          errorMessage: null,
        },
      });

      this.logger.log(`Token refreshed for connection ${connectionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Token refresh failed for connection ${connectionId}: ${message}`,
      );

      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          status: 'ERROR',
          errorMessage: `Token refresh failed: ${message}`,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook Subscription Management
  // ---------------------------------------------------------------------------

  async renewWebhookSubscription(connectionId: string): Promise<void> {
    this.logger.log(`Renewing webhook subscription for Google connection ${connectionId}`);
    await this.renewWatchChannels(connectionId);
  }

  // ---------------------------------------------------------------------------
  // Connection Sync (used by fallback handler)
  // ---------------------------------------------------------------------------

  async syncConnection(connectionId: string, _tenantId: string): Promise<void> {
    this.logger.log(`Running sync for connection ${connectionId}`);
    await this.syncInboundEvents(connectionId);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );
  }

  /**
   * Get an authenticated OAuth2 client for a connection.
   * Decrypts stored tokens and sets credentials.
   */
  private async getAuthenticatedClient(
    connection: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      tokenExpiresAt: Date | null;
    },
  ): Promise<OAuth2Client> {
    const oauth2Client = this.createOAuth2Client();

    const accessToken = this.decryptToken(connection.accessToken);
    const refreshToken = connection.refreshToken
      ? this.decryptToken(connection.refreshToken)
      : undefined;

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.tokenExpiresAt?.getTime(),
    });

    return oauth2Client;
  }

  /**
   * Retrieve an active connection or throw.
   */
  private async getActiveConnection(connectionId: string) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Calendar connection not found');
    }

    if (connection.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Calendar connection is ${connection.status} — reconnect to continue`,
      );
    }

    return connection;
  }

  /**
   * Extract calendar IDs from the syncCalendars JSON field.
   * Falls back to ['primary'] if none configured.
   */
  private getSyncCalendarIds(connection: { syncCalendars: Prisma.JsonValue | null }): string[] {
    if (!connection.syncCalendars) {
      return ['primary'];
    }

    const calendars = connection.syncCalendars as unknown[];
    if (!Array.isArray(calendars) || calendars.length === 0) {
      return ['primary'];
    }

    // syncCalendars can be an array of strings (IDs) or objects with { id }
    return calendars.map((cal) => {
      if (typeof cal === 'string') return cal;
      if (typeof cal === 'object' && cal !== null && 'id' in cal) {
        return (cal as { id: string }).id;
      }
      return 'primary';
    });
  }

  /**
   * Sync events for a single Google Calendar, using incremental sync when available.
   */
  private async syncCalendarEvents(
    calendarApi: calendar_v3.Calendar,
    connection: {
      id: string;
      tenantId: string;
      syncCalendars: Prisma.JsonValue | null;
    },
    calendarId: string,
  ): Promise<{ added: number; updated: number; deleted: number }> {
    let added = 0;
    let updated = 0;
    let deleted = 0;

    // Build sync token key in Redis for per-calendar incremental sync
    const syncTokenKey = `calendar:syncToken:${connection.id}:${calendarId}`;
    const storedSyncToken = await this.redisService.get(syncTokenKey);

    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    try {
      do {
        const params: calendar_v3.Params$Resource$Events$List = {
          calendarId,
          maxResults: 250,
          singleEvents: true,
          pageToken,
        };

        if (storedSyncToken && !pageToken) {
          params.syncToken = storedSyncToken;
        } else if (!storedSyncToken) {
          // Full sync: get events from last 30 days and next 90 days
          params.timeMin = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          params.timeMax = new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString();
        }

        const res = await calendarApi.events.list(params);
        const events = res.data.items || [];
        nextSyncToken = res.data.nextSyncToken || undefined;
        pageToken = res.data.nextPageToken || undefined;

        for (const gcalEvent of events) {
          if (!gcalEvent.id) continue;

          if (gcalEvent.status === 'cancelled') {
            // Delete local event
            const deletedCount = await this.prisma.calendarEvent.deleteMany({
              where: {
                calendarConnectionId: connection.id,
                externalEventId: gcalEvent.id,
                direction: 'INBOUND',
              },
            });
            deleted += deletedCount.count;
            continue;
          }

          const startTime = gcalEvent.start?.dateTime
            ? new Date(gcalEvent.start.dateTime)
            : gcalEvent.start?.date
              ? new Date(gcalEvent.start.date)
              : null;
          const endTime = gcalEvent.end?.dateTime
            ? new Date(gcalEvent.end.dateTime)
            : gcalEvent.end?.date
              ? new Date(gcalEvent.end.date)
              : null;

          if (!startTime || !endTime) continue;

          const existing = await this.prisma.calendarEvent.findFirst({
            where: {
              calendarConnectionId: connection.id,
              externalEventId: gcalEvent.id,
              direction: 'INBOUND',
            },
          });

          if (existing) {
            await this.prisma.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: gcalEvent.summary || null,
                startTime,
                endTime,
                syncedAt: new Date(),
              },
            });
            updated++;
          } else {
            await this.prisma.calendarEvent.create({
              data: {
                tenantId: connection.tenantId,
                calendarConnectionId: connection.id,
                externalEventId: gcalEvent.id,
                direction: 'INBOUND',
                title: gcalEvent.summary || null,
                startTime,
                endTime,
                syncedAt: new Date(),
              },
            });
            added++;
          }
        }
      } while (pageToken);

      // Store the new sync token for incremental sync next time
      if (nextSyncToken) {
        await this.redisService.set(syncTokenKey, nextSyncToken);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      // If sync token is invalid (410 Gone), clear it and do full sync
      if (message.includes('410') || message.includes('Sync token')) {
        this.logger.warn(
          `Invalid sync token for connection ${connection.id}, calendar ${calendarId} — clearing for full sync`,
        );
        await this.redisService.del(syncTokenKey);
        // Recursive call will do a full sync
        return this.syncCalendarEvents(calendarApi, connection, calendarId);
      }

      throw err;
    }

    return { added, updated, deleted };
  }

  // ---------------------------------------------------------------------------
  // OAuth State Signing
  // ---------------------------------------------------------------------------

  private createSignedState(data: Record<string, string>): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = JSON.stringify({ ...data, nonce, ts: Date.now() });
    const payloadB64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', this.stateHmacKey).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
  }

  private verifySignedState<T extends Record<string, string>>(state: string): T {
    const [payloadB64, sig] = state.split('.');
    if (!payloadB64 || !sig) throw new BadRequestException('Invalid state parameter');

    const expectedSig = crypto.createHmac('sha256', this.stateHmacKey).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new BadRequestException('Invalid state signature');
    }

    const data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as T & { ts: number };
    if (Date.now() - data.ts > 10 * 60 * 1000) {
      throw new BadRequestException('State parameter expired');
    }
    return data as T;
  }

  // ---------------------------------------------------------------------------
  // Token Encryption (AES-256-GCM)
  // ---------------------------------------------------------------------------

  /**
   * Encrypt a token string using AES-256-GCM.
   * Returns format: {iv}:{encrypted}:{tag} (all hex-encoded).
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  }

  /**
   * Decrypt a token string from AES-256-GCM format.
   */
  private decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, encryptedHex, tagHex] = parts;
    const iv = Buffer.from(ivHex!, 'hex');
    const encrypted = Buffer.from(encryptedHex!, 'hex');
    const tag = Buffer.from(tagHex!, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
