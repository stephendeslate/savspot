import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Service for managing browser push subscriptions and sending
 * Web Push notifications via the web-push library.
 *
 * Operates in no-op mode when VAPID keys are not configured,
 * allowing the application to start without push support.
 *
 * Rate-limits push notifications to 5 per user per hour via Redis.
 */
@Injectable()
export class BrowserPushService {
  private readonly logger = new Logger(BrowserPushService.name);
  private readonly isConfigured: boolean;

  private static readonly MAX_PUSHES_PER_HOUR = 5;
  private static readonly RATE_LIMIT_TTL_SECONDS = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const vapidPublicKey = this.configService.get<string>('vapid.publicKey');
    const vapidPrivateKey = this.configService.get<string>('vapid.privateKey');
    const vapidSubject = this.configService.get<string>('vapid.subject', 'mailto:support@savspot.co');

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('Web Push initialized with VAPID keys');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'VAPID keys not configured — browser push will operate in no-op mode',
      );
    }
  }

  /**
   * Registers a push subscription for a user within a tenant.
   */
  async subscribe(
    userId: string,
    tenantId: string,
    subscription: PushSubscriptionInput,
  ) {
    // Check for existing subscription with same endpoint to avoid duplicates
    const existing = await this.prisma.browserPushSubscription.findFirst({
      where: {
        userId,
        tenantId,
        endpoint: subscription.endpoint,
      },
    });

    if (existing) {
      // Update keys in case they changed
      return this.prisma.browserPushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.browserPushSubscription.create({
      data: {
        userId,
        tenantId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Removes a push subscription by ID.
   */
  async unsubscribe(subscriptionId: string) {
    await this.prisma.browserPushSubscription.delete({
      where: { id: subscriptionId },
    });

    this.logger.log(`Push subscription ${subscriptionId} removed`);
  }

  /**
   * Sends a push notification to all subscriptions for a user within a tenant.
   * On 410 Gone responses, automatically removes the stale subscription.
   * Rate-limited to MAX_PUSHES_PER_HOUR per user per hour.
   */
  async sendToUser(
    userId: string,
    tenantId: string,
    payload: PushPayload,
  ): Promise<number> {
    if (!this.isConfigured) {
      this.logger.debug(
        `Push notification skipped (no-op mode): ${payload.title}`,
      );
      return 0;
    }

    // Rate limiting check
    const rateLimitKey = `push:ratelimit:${userId}:${tenantId}`;
    const currentCount = await this.redisService.get(rateLimitKey);

    if (
      currentCount !== null &&
      parseInt(currentCount, 10) >= BrowserPushService.MAX_PUSHES_PER_HOUR
    ) {
      this.logger.warn(
        `Push rate limit exceeded for user ${userId} in tenant ${tenantId}`,
      );
      return 0;
    }

    const subscriptions = await this.prisma.browserPushSubscription.findMany({
      where: { userId, tenantId },
    });

    if (subscriptions.length === 0) {
      return 0;
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
    });

    let sentCount = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString,
        );

        // Update lastUsedAt
        await this.prisma.browserPushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });

        sentCount++;
      } catch (error) {
        const statusCode =
          error instanceof webPush.WebPushError ? error.statusCode : null;

        if (statusCode === 410) {
          // Subscription expired — remove it
          this.logger.log(
            `Removing expired push subscription ${sub.id} (410 Gone)`,
          );
          await this.prisma.browserPushSubscription
            .delete({ where: { id: sub.id } })
            .catch((deleteErr) => { this.logger.warn(`Failed to delete expired push subscription: ${deleteErr instanceof Error ? deleteErr.message : 'Unknown error'}`); });
        } else {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send push to subscription ${sub.id}: ${message}`,
          );
        }
      }
    }

    // Increment rate limit counter
    if (sentCount > 0) {
      if (currentCount === null) {
        await this.redisService.setex(
          rateLimitKey,
          BrowserPushService.RATE_LIMIT_TTL_SECONDS,
          String(sentCount),
        );
      } else {
        const newCount = parseInt(currentCount, 10) + sentCount;
        // Keep the existing TTL by using setex with remaining time
        await this.redisService.setex(
          rateLimitKey,
          BrowserPushService.RATE_LIMIT_TTL_SECONDS,
          String(newCount),
        );
      }
    }

    return sentCount;
  }

  /**
   * Sends a push notification to all OWNER and ADMIN members of a tenant.
   */
  async sendToTenantAdmins(
    tenantId: string,
    payload: PushPayload,
  ): Promise<number> {
    if (!this.isConfigured) {
      this.logger.debug(
        `Push to tenant admins skipped (no-op mode): ${payload.title}`,
      );
      return 0;
    }

    const adminMembers = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });

    if (adminMembers.length === 0) {
      this.logger.warn(`No admin members found for tenant ${tenantId}`);
      return 0;
    }

    let totalSent = 0;

    for (const member of adminMembers) {
      const sent = await this.sendToUser(member.userId, tenantId, payload);
      totalSent += sent;
    }

    this.logger.log(
      `Sent ${totalSent} push notification(s) to ${adminMembers.length} admin(s) in tenant ${tenantId}`,
    );

    return totalSent;
  }
}
