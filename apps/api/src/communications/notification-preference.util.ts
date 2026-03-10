import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('NotificationPreferenceUtil');

/**
 * Notification preference check result.
 */
export interface PreferenceCheckResult {
  /** Whether to send immediately (true) or defer to digest (false) */
  sendImmediately: boolean;
  /** Whether the specific channel is enabled for this category */
  channelEnabled: boolean;
}

/**
 * Check a user's notification preferences before dispatching.
 *
 * @param prisma - PrismaService instance
 * @param userId - The recipient user ID
 * @param category - Notification category (e.g. 'BOOKING', 'PAYMENT')
 * @param channel - Delivery channel ('email', 'push', 'sms', 'in_app')
 * @returns PreferenceCheckResult with sendImmediately and channelEnabled flags
 */
export async function checkNotificationPreference(
  prisma: PrismaService,
  userId: string,
  category: string,
  channel: 'email' | 'push' | 'sms' | 'in_app',
): Promise<PreferenceCheckResult> {
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        digestFrequency: true,
        preferences: true,
      },
    });

    // No preference record — default to immediate send, all channels enabled
    if (!pref) {
      return { sendImmediately: true, channelEnabled: true };
    }

    // Check digest frequency
    const sendImmediately = pref.digestFrequency === 'IMMEDIATE';

    // Check channel-specific preferences
    let channelEnabled = true;
    if (pref.preferences && typeof pref.preferences === 'object') {
      const prefs = pref.preferences as Record<
        string,
        Record<string, boolean>
      >;
      const categoryPrefs = prefs[category.toUpperCase()];
      if (categoryPrefs && typeof categoryPrefs[channel] === 'boolean') {
        channelEnabled = categoryPrefs[channel];
      }
    }

    return { sendImmediately, channelEnabled };
  } catch (error) {
    logger.warn(
      `Failed to check notification preference for user ${userId}: ${error}`,
    );
    // Fail open — send the notification
    return { sendImmediately: true, channelEnabled: true };
  }
}
