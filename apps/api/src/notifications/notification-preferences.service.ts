import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DigestFrequency, Prisma } from '../../../../prisma/generated/prisma';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string, tenantId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      return {
        userId,
        tenantId,
        digestFrequency: 'IMMEDIATE',
        preferences: {},
      };
    }

    return {
      userId,
      tenantId,
      digestFrequency: pref.digestFrequency,
      preferences: pref.preferences ?? {},
      quietHoursStart: pref.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd,
      quietHoursTimezone: pref.quietHoursTimezone,
    };
  }

  async updatePreferences(
    userId: string,
    tenantId: string,
    prefs: Record<string, { email?: boolean; sms?: boolean; in_app?: boolean; push?: boolean }>,
  ) {
    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        preferences: prefs as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId,
        preferences: prefs as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Notification preferences updated for user ${userId} in tenant ${tenantId}`,
    );

    return updated;
  }

  async getDigestFrequency(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
      select: { digestFrequency: true },
    });

    return { digestFrequency: pref?.digestFrequency ?? 'IMMEDIATE' };
  }

  async updateDigestFrequency(userId: string, frequency: string) {
    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        digestFrequency: frequency as DigestFrequency,
      },
      create: {
        userId,
        digestFrequency: frequency as DigestFrequency,
      },
    });

    this.logger.log(
      `Digest frequency updated to ${frequency} for user ${userId}`,
    );

    return { digestFrequency: updated.digestFrequency };
  }
}
