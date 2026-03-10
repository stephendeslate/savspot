import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Default quiet hours: 9 PM to 8 AM.
 */
const DEFAULT_QUIET_HOURS_START = 21; // 9 PM
const DEFAULT_QUIET_HOURS_END = 8; // 8 AM

interface QuietHoursConfig {
  startHour: number;
  endHour: number;
  timezone: string;
}

const logger = new Logger('QuietHoursUtil');

/**
 * Loads quiet hours configuration for a user.
 * Falls back to tenant timezone + default hours if no user preferences exist.
 */
export async function loadQuietHoursConfig(
  prisma: PrismaService,
  userId: string,
  tenantTimezone?: string,
): Promise<QuietHoursConfig> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      quietHoursStart: true,
      quietHoursEnd: true,
      quietHoursTimezone: true,
    },
  });

  const timezone = pref?.quietHoursTimezone ?? tenantTimezone ?? 'UTC';
  let startHour = DEFAULT_QUIET_HOURS_START;
  let endHour = DEFAULT_QUIET_HOURS_END;

  if (pref?.quietHoursStart) {
    startHour = pref.quietHoursStart.getUTCHours();
  }
  if (pref?.quietHoursEnd) {
    endHour = pref.quietHoursEnd.getUTCHours();
  }

  return { startHour, endHour, timezone };
}

/**
 * Check if the current time is within quiet hours for the given timezone.
 * Supports both user-configured quiet hours and default 21:00-08:00.
 */
export function isInQuietHours(config: QuietHoursConfig): boolean {
  try {
    const now = new Date();
    const hour = parseInt(
      now.toLocaleString('en-US', {
        timeZone: config.timezone,
        hour: 'numeric',
        hour12: false,
      }),
      10,
    );

    if (config.startHour > config.endHour) {
      // Quiet hours span midnight (e.g. 21:00-08:00)
      return hour >= config.startHour || hour < config.endHour;
    } else {
      // Quiet hours within same day (e.g. 01:00-06:00)
      return hour >= config.startHour && hour < config.endHour;
    }
  } catch {
    logger.warn(`Invalid timezone: ${config.timezone} — skipping quiet hours`);
    return false;
  }
}

/**
 * Check quiet hours using tenant timezone + default hours.
 * Convenience function when no user context is available.
 */
export function isInQuietHoursForTimezone(timezone: string): boolean {
  return isInQuietHours({
    startHour: DEFAULT_QUIET_HOURS_START,
    endHour: DEFAULT_QUIET_HOURS_END,
    timezone,
  });
}

/**
 * Calculate milliseconds until quiet hours end.
 */
export function msUntilQuietHoursEnd(config: QuietHoursConfig): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour');
    const minutePart = parts.find((p) => p.type === 'minute');

    const currentHour = parseInt(hourPart?.value || '0', 10);
    const currentMinute = parseInt(minutePart?.value || '0', 10);

    let hoursUntilEnd: number;
    if (currentHour >= config.startHour) {
      // Evening: hours until midnight + hours from midnight to end
      hoursUntilEnd = 24 - currentHour + config.endHour;
    } else {
      // Early morning: hours from now to end
      hoursUntilEnd = config.endHour - currentHour;
    }

    const minutesUntilEnd = hoursUntilEnd * 60 - currentMinute;
    return Math.max(minutesUntilEnd * 60 * 1000, 60 * 1000); // Min 1 minute
  } catch {
    // Fallback: delay 8 hours
    return 8 * 60 * 60 * 1000;
  }
}
