import { Injectable, Logger } from '@nestjs/common';
import { GoogleCalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CalendarSyncJobData {
  connectionId: string;
  tenantId: string;
  manual?: boolean;
  triggeredBy?: string;
  channelId?: string;
  resourceId?: string;
  subscriptionId?: string;
}

/**
 * Processor for the calendarTwoWaySync job.
 * Performs incremental inbound sync from Google Calendar, logs results,
 * and detects conflicts with existing bookings.
 */
@Injectable()
export class CalendarSyncHandler {
  private readonly logger = new Logger(CalendarSyncHandler.name);

  constructor(
    private readonly calendarService: GoogleCalendarService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(data: CalendarSyncJobData): Promise<void> {
    const { connectionId, tenantId, manual, triggeredBy } = data;

    if (!connectionId || !tenantId) {
      this.logger.warn(
        `Skipping calendar sync: missing ${!connectionId ? 'connectionId' : 'tenantId'} — job should be enqueued per-connection`,
      );
      return;
    }

    this.logger.log(
      `Starting calendar sync for connection ${connectionId} (tenant: ${tenantId}, trigger: ${triggeredBy || (manual ? 'manual' : 'scheduled')})`,
    );

    try {
      const result =
        await this.calendarService.syncInboundEvents(connectionId);

      this.logger.log(
        `Calendar sync complete for connection ${connectionId}: ` +
          `added=${result.added}, updated=${result.updated}, deleted=${result.deleted}`,
      );

      // Detect conflicts between inbound events and existing bookings
      if (result.added > 0 || result.updated > 0) {
        await this.detectConflicts(tenantId, connectionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Calendar sync failed for connection ${connectionId}: ${message}`,
      );
      throw err; // Let the queue runtime retry (BullMQ or Inngest)
    }
  }

  /**
   * Check for inbound calendar events that overlap with existing bookings.
   * Logs warnings and emits notification events for each conflict found.
   */
  private async detectConflicts(
    tenantId: string,
    connectionId: string,
  ): Promise<void> {
    const now = new Date();

    // All queries within tenant context
    const inboundEvents = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      return tx.calendarEvent.findMany({
        where: {
          tenantId,
          calendarConnectionId: connectionId,
          direction: 'INBOUND',
          endTime: { gt: now },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      });
    });

    if (inboundEvents.length === 0) return;

    // Find overlapping bookings for each inbound event
    for (const event of inboundEvents) {
      const conflictingBookings = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

        return tx.booking.findMany({
          where: {
            tenantId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startTime: { lt: event.endTime },
            endTime: { gt: event.startTime },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            service: { select: { name: true } },
            client: { select: { name: true } },
          },
        });
      });

      for (const booking of conflictingBookings) {
        this.logger.warn(
          `[calendar-conflict] Inbound event "${event.title ?? 'Untitled'}" ` +
            `(${event.startTime.toISOString()} - ${event.endTime.toISOString()}) ` +
            `conflicts with booking ${booking.id} ` +
            `(${booking.service.name} for ${booking.client?.name ?? 'Unknown'})`,
        );

        // Create in-app notification for staff
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

            const members = await tx.tenantMembership.findMany({
              where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
              select: { userId: true },
            });

            // Ensure notification type exists
            const notifType = await tx.notificationType.upsert({
              where: { key: 'calendar.conflict' },
              update: {},
              create: {
                key: 'calendar.conflict',
                name: 'Calendar Conflict',
                category: 'CALENDAR',
                defaultChannels: ['IN_APP'],
                isSystem: true,
              },
            });

            for (const member of members) {
              await tx.notification.create({
                data: {
                  tenantId,
                  userId: member.userId,
                  typeId: notifType.id,
                  title: 'Calendar Conflict Detected',
                  body: `External event "${event.title ?? 'Untitled'}" overlaps with booking for ${booking.service.name} (${booking.client?.name ?? 'Unknown client'})`,
                  data: {
                    type: 'CALENDAR_CONFLICT',
                    bookingId: booking.id,
                    calendarEventId: event.id,
                  } as Record<string, string>,
                },
              });
            }
          });
        } catch (notifyError) {
          this.logger.warn(
            `Failed to create conflict notification: ${notifyError instanceof Error ? notifyError.message : 'Unknown'}`,
          );
        }
      }
    }
  }
}
