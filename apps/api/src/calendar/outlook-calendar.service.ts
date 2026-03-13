import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface MicrosoftCalendarListResponse {
  value: Array<{
    id: string;
    name: string;
    isDefaultCalendar?: boolean;
    color?: string;
    canEdit?: boolean;
  }>;
}

/**
 * Microsoft 365 / Outlook Calendar integration service.
 * Handles OAuth flow and token storage for Microsoft Graph API calendar access.
 */
@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly encryptionKey: Buffer;
  private readonly stateHmacKey: Buffer;

  private readonly SCOPES = ['Calendars.ReadWrite', 'offline_access'];

  private readonly AUTHORIZE_URL =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  private readonly TOKEN_URL =
    'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>(
      'microsoftCalendar.clientId',
      '',
    );
    this.clientSecret = this.configService.get<string>(
      'microsoftCalendar.clientSecret',
      '',
    );
    this.redirectUri = this.configService.get<string>(
      'microsoftCalendar.redirectUri',
      'http://localhost:3001/api/auth/outlook-calendar/callback',
    );

    // Derive AES-256 encryption key from JWT private key
    const jwtKey = this.configService.get<string>('jwt.privateKeyBase64');
    if (!jwtKey) {
      this.logger.warn(
        'jwt.privateKeyBase64 not set — Outlook calendar encryption will use a non-persistent key. Set JWT_PRIVATE_KEY_BASE64 for production use.',
      );
    }
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(jwtKey || crypto.randomBytes(32).toString('hex'))
      .digest();

    this.stateHmacKey = crypto.createHash('sha256').update(this.encryptionKey).update('oauth-state').digest();
  }

  // ---------------------------------------------------------------------------
  // OAuth Flow
  // ---------------------------------------------------------------------------

  /**
   * Generates a Microsoft OAuth2 authorization URL for calendar access.
   * State param encodes tenantId + userId for the callback.
   */
  getAuthUrl(tenantId: string, userId: string): string {
    const state = this.createSignedState(tenantId, userId);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.SCOPES.join(' '),
      state,
      response_mode: 'query',
      prompt: 'consent',
    });

    return `${this.AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Handles the OAuth callback: exchanges code for tokens,
   * creates CalendarConnection, fetches available calendars.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ tenantId: string; connectionId: string }> {
    // Verify and decode signed state
    let stateData: { tenantId: string; userId: string };
    try {
      stateData = this.verifySignedState(state);
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    const { tenantId, userId } = stateData;

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // Encrypt tokens
    const encryptedAccess = this.encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? this.encryptToken(tokens.refresh_token)
      : null;

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch calendar list for syncCalendars default
    let syncCalendars: Prisma.InputJsonValue = [];
    try {
      syncCalendars = await this.fetchCalendarList(
        tokens.access_token,
      ) as unknown as Prisma.InputJsonValue;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Failed to fetch calendar list: ${message}`);
    }

    // Upsert CalendarConnection — one per tenant+user+provider
    const existing = await this.prisma.calendarConnection.findFirst({
      where: { tenantId, userId, provider: 'MICROSOFT' },
    });

    let connection;
    if (existing) {
      connection = await this.prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
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
          provider: 'MICROSOFT',
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
          status: 'ACTIVE',
          syncDirection: 'TWO_WAY',
          syncFrequencyMinutes: 15,
          syncCalendars,
        },
      });
    }

    this.logger.log(
      `Outlook calendar connection ${existing ? 'updated' : 'created'}: ${connection.id} for tenant ${tenantId}`,
    );

    return { tenantId, connectionId: connection.id };
  }

  // ---------------------------------------------------------------------------
  // Webhook Subscription Management
  // ---------------------------------------------------------------------------

  async findConnectionBySubscriptionId(subscriptionId: string) {
    return this.prisma.calendarConnection.findFirst({
      where: {
        provider: 'MICROSOFT',
        webhookChannelId: subscriptionId,
        status: 'ACTIVE',
      },
    });
  }

  async renewWebhookSubscription(connectionId: string): Promise<void> {
    this.logger.log(`Renewing webhook subscription for Outlook connection ${connectionId}`);

    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      this.logger.warn(`Calendar connection ${connectionId} not found`);
      return;
    }

    if (!connection.webhookChannelId) {
      this.logger.warn(`No webhook subscription ID for connection ${connectionId}`);
      return;
    }

    let accessToken = this.decryptToken(connection.accessToken);

    const isExpired =
      connection.tokenExpiresAt && connection.tokenExpiresAt <= new Date();

    if (isExpired) {
      if (!connection.refreshToken) {
        this.logger.error(
          `Token expired and no refresh token for connection ${connectionId}`,
        );
        await this.prisma.calendarConnection.update({
          where: { id: connectionId },
          data: { status: 'ERROR', errorMessage: 'Token expired, no refresh token available' },
        });
        return;
      }

      const refreshed = await this.refreshAccessToken(
        this.decryptToken(connection.refreshToken),
      );

      accessToken = refreshed.access_token;

      const tokenExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000,
      );

      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: this.encryptToken(refreshed.access_token),
          refreshToken: refreshed.refresh_token
            ? this.encryptToken(refreshed.refresh_token)
            : connection.refreshToken,
          tokenExpiresAt,
        },
      });
    }

    const newExpiry = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    );

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${connection.webhookChannelId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirationDateTime: newExpiry.toISOString(),
        }),
      },
    );

    if (response.status === 404) {
      this.logger.warn(
        `Subscription ${connection.webhookChannelId} no longer exists, clearing webhook data`,
      );
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          webhookChannelId: null,
          webhookExpiresAt: null,
        },
      });
      return;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to renew subscription ${connection.webhookChannelId}: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Microsoft Graph subscription renewal failed: ${response.status}`,
      );
    }

    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { webhookExpiresAt: newExpiry },
    });

    this.logger.log(
      `Renewed webhook subscription ${connection.webhookChannelId} until ${newExpiry.toISOString()}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private createSignedState(tenantId: string, userId: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = JSON.stringify({ tenantId, userId, nonce, timestamp });
    const signature = crypto.createHmac('sha256', this.stateHmacKey)
      .update(payload)
      .digest('base64url');
    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  }

  private verifySignedState(state: string): { tenantId: string; userId: string } {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      payload: string;
      signature: string;
    };
    const expectedSig = crypto.createHmac('sha256', this.stateHmacKey)
      .update(decoded.payload)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(decoded.signature), Buffer.from(expectedSig))) {
      throw new Error('Invalid OAuth state signature');
    }
    const data = JSON.parse(decoded.payload) as {
      tenantId: string;
      userId: string;
      nonce: string;
      timestamp: string;
    };
    const elapsed = Date.now() - parseInt(data.timestamp, 10);
    if (elapsed > 600_000) {
      throw new Error('OAuth state expired');
    }
    return { tenantId: data.tenantId, userId: data.userId };
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  private async exchangeCodeForTokens(
    code: string,
  ): Promise<MicrosoftTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to exchange auth code: ${response.status} ${errorBody}`,
      );
      throw new BadRequestException(
        'Failed to exchange authorization code with Microsoft',
      );
    }

    const data = (await response.json()) as MicrosoftTokenResponse;

    if (!data.access_token) {
      throw new BadRequestException(
        'No access token received from Microsoft',
      );
    }

    return data;
  }

  /**
   * Fetch the user's calendar list from Microsoft Graph API.
   */
  private async fetchCalendarList(
    accessToken: string,
  ): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendars',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Microsoft Graph calendars request failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as MicrosoftCalendarListResponse;

    return (data.value || []).map((cal) => ({
      id: cal.id,
      summary: cal.name,
      primary: cal.isDefaultCalendar || false,
    }));
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

  /**
   * Refresh an expired access token using a refresh token.
   */
  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<MicrosoftTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: this.SCOPES.join(' '),
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to refresh Microsoft token: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Microsoft token refresh failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as MicrosoftTokenResponse;

    if (!data.access_token) {
      throw new Error('No access token returned from Microsoft token refresh');
    }

    return data;
  }
}
