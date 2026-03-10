// =============================================================================
// Seed: NotificationType
// =============================================================================

import type { PrismaClient } from '../generated/prisma/index.js';

export async function seedNotificationTypes(prisma: PrismaClient): Promise<void> {
  const notificationTypes = [
    // ---- Booking notifications ----
    {
      key: 'booking_confirmed',
      name: 'Booking Confirmed',
      category: 'BOOKING' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a booking is confirmed',
    },
    {
      key: 'booking_cancelled',
      name: 'Booking Cancelled',
      category: 'BOOKING' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a booking is cancelled',
    },
    {
      key: 'booking_rescheduled',
      name: 'Booking Rescheduled',
      category: 'BOOKING' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a booking is rescheduled',
    },
    {
      key: 'booking_reminder',
      name: 'Booking Reminder',
      category: 'BOOKING' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Reminder sent before a scheduled booking',
    },
    {
      key: 'booking_no_show',
      name: 'Booking No-Show',
      category: 'BOOKING' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a client is marked as a no-show',
    },

    // ---- Payment notifications ----
    {
      key: 'payment_received',
      name: 'Payment Received',
      category: 'PAYMENT' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a payment is successfully received',
    },
    {
      key: 'payment_failed',
      name: 'Payment Failed',
      category: 'PAYMENT' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a payment attempt fails',
    },
    {
      key: 'payment_refunded',
      name: 'Payment Refunded',
      category: 'PAYMENT' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a payment is refunded',
    },

    // ---- System notifications ----
    {
      key: 'new_review',
      name: 'New Review',
      category: 'SYSTEM' as const,
      defaultChannels: ['IN_APP'],
      isSystem: true,
      description: 'Sent when a new review is submitted',
    },
    {
      key: 'team_invitation',
      name: 'Team Invitation',
      category: 'SYSTEM' as const,
      defaultChannels: ['EMAIL', 'IN_APP'],
      isSystem: true,
      description: 'Sent when a user is invited to join a team',
    },
    {
      key: 'calendar_sync_failed',
      name: 'Calendar Sync Failed',
      category: 'SYSTEM' as const,
      defaultChannels: ['IN_APP'],
      isSystem: true,
      description: 'Sent when a calendar sync operation fails',
    },
  ];

  for (const nt of notificationTypes) {
    await prisma.notificationType.upsert({
      where: { key: nt.key },
      update: {},
      create: nt,
    });
  }

  console.log(`  Created ${notificationTypes.length} notification types`);
}
