import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo | null;
  private static readonly MAX_FAILURE_COUNT = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) {
      this.expo = new Expo({ accessToken });
      this.logger.log('Expo Push initialized with access token');
    } else {
      this.expo = null;
      this.logger.warn(
        'EXPO_ACCESS_TOKEN not configured — mobile push will operate in no-op mode',
      );
    }
  }

  async sendToUser(
    userId: string,
    _tenantId: string,
    payload: ExpoPushPayload,
  ): Promise<number> {
    if (!this.expo) {
      this.logger.debug(`Expo push skipped (no-op mode): ${payload.title}`);
      return 0;
    }

    const tokens = await this.prisma.devicePushToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) return 0;

    const messages: ExpoPushMessage[] = [];
    const validTokens: typeof tokens = [];
    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token.token)) {
        this.logger.warn(`Invalid Expo push token: ${token.id}`);
        continue;
      }
      messages.push({
        to: token.token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      });
      validTokens.push(token);
    }

    if (messages.length === 0) return 0;

    let sentCount = 0;
    try {
      const tickets = await this.expo.sendPushNotificationsAsync(messages);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i] as ExpoPushTicket;
        const token = validTokens[i]!;

        if (ticket.status === 'ok') {
          sentCount++;
        } else if (ticket.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            this.logger.log(
              `Deactivating unregistered device token ${token.id}`,
            );
            await this.prisma.devicePushToken.update({
              where: { id: token.id },
              data: { isActive: false },
            });
          } else {
            const newFailureCount = token.failureCount + 1;
            await this.prisma.devicePushToken.update({
              where: { id: token.id },
              data: {
                failureCount: newFailureCount,
                isActive: newFailureCount < ExpoPushService.MAX_FAILURE_COUNT,
              },
            });
            this.logger.error(
              `Expo push failed for token ${token.id}: ${ticket.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Expo push batch send failed: ${error}`);
    }

    this.logger.log(
      `Expo push sent to ${sentCount}/${messages.length} device(s) for user ${userId}`,
    );
    return sentCount;
  }
}
