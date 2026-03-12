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

    // Derive AES-256 encryption key from JWT private key or fallback
    const jwtKey = this.configService.get<string>('jwt.privateKeyBase64');
    const keySource = jwtKey || 'dev-calendar-encryption-key-change-in-prod';
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(keySource)
      .digest();
  }

  // ---------------------------------------------------------------------------
  // OAuth Flow
  // ---------------------------------------------------------------------------

  /**
   * Generates a Microsoft OAuth2 authorization URL for calendar access.
   * State param encodes tenantId + userId for the callback.
   */
  getAuthUrl(tenantId: string, userId: string): string {
    const state = Buffer.from(
      JSON.stringify({ tenantId, userId }),
    ).toString('base64url');

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
    // Decode state
    let stateData: { tenantId: string; userId: string };
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      );
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
    // TODO: Implement Microsoft Graph subscription renewal
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

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
}
