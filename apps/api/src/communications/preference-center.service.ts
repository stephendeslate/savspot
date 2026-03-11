import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from './communications.service';
import { UpdatePreferenceCenterDto } from './dto/update-preference-center.dto';

@Injectable()
export class PreferenceCenterService {
  private readonly logger = new Logger(PreferenceCenterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async getByToken(token: string) {
    const result = this.communicationsService.validateUnsubscribeToken(token);
    if (!result) {
      throw new NotFoundException('Invalid or expired preference token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired preference token');
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: result.userId },
    });

    const prefs = (preference?.preferences as Record<string, boolean> | null) ?? {};

    return {
      userName: user.name,
      preferences: {
        marketingEmails: prefs['marketingEmails'] ?? true,
        bookingReminders: prefs['bookingReminders'] ?? true,
        reviewRequests: prefs['reviewRequests'] ?? true,
        smsNotifications: prefs['smsNotifications'] ?? true,
      },
    };
  }

  async updateByToken(token: string, dto: UpdatePreferenceCenterDto) {
    const result = this.communicationsService.validateUnsubscribeToken(token);
    if (!result) {
      throw new NotFoundException('Invalid or expired preference token');
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: result.userId },
    });

    if (!preference) {
      throw new NotFoundException('No notification preferences found for this user');
    }

    const currentPrefs = (preference.preferences as Record<string, boolean>) ?? {};

    if (dto.unsubscribeAll) {
      await this.prisma.notificationPreference.update({
        where: { id: preference.id },
        data: {
          preferences: {
            ...currentPrefs,
            marketingEmails: false,
            bookingReminders: false,
            reviewRequests: false,
            smsNotifications: false,
          },
        },
      });

      this.logger.log(`User ${result.userId} unsubscribed from all via preference center`);
      return { message: 'Successfully unsubscribed from all communications' };
    }

    const updates: Record<string, boolean> = { ...currentPrefs };
    if (dto.marketingEmails !== undefined) updates['marketingEmails'] = dto.marketingEmails;
    if (dto.bookingReminders !== undefined) updates['bookingReminders'] = dto.bookingReminders;
    if (dto.reviewRequests !== undefined) updates['reviewRequests'] = dto.reviewRequests;
    if (dto.smsNotifications !== undefined) updates['smsNotifications'] = dto.smsNotifications;

    await this.prisma.notificationPreference.update({
      where: { id: preference.id },
      data: {
        preferences: updates,
      },
    });

    return { message: 'Preferences updated successfully' };
  }
}
