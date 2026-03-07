import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './calendar.service';
import {
  BOOKING_CONFIRMED,
  BOOKING_RESCHEDULED,
  BOOKING_CANCELLED,
} from '../events/event.types';

interface CalendarEventPushJobData {
  eventType: string;
  tenantId: string;
  bookingId: string;
  serviceName: string;
  clientName: string;
  startTime: string; // ISO string (serialized from Date)
  endTime: string;
  previousStartTime?: string;
  previousEndTime?: string;
  newStartTime?: string;
  newEndTime?: string;
}

/**
 * Processor for the calendarEventPush job.
 * Pushes booking events (confirmed, rescheduled, cancelled) to Google Calendar.
 */
@Injectable()
export class CalendarPushHandler {
  private readonly logger = new Logger(CalendarPushHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: GoogleCalendarService,
  ) {}

  async handle(job: Job<CalendarEventPushJobData>): Promise<void> {
    const {
      eventType,
      tenantId,
      bookingId,
      serviceName,
      clientName,
      startTime,
      endTime,
    } = job.data;

    this.logger.log(
      `Processing calendar push: ${eventType} for booking ${bookingId} (tenant: ${tenantId})`,
    );

    // Find the tenant's active calendar connection
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' }, // Use the oldest (primary) connection
    });

    if (!connection) {
      this.logger.log(
        `No active calendar connection for tenant ${tenantId} — skipping push`,
      );
      return;
    }

    try {
      switch (eventType) {
        case BOOKING_CONFIRMED: {
          await this.handleBookingConfirmed(
            connection.id,
            bookingId,
            serviceName,
            clientName,
            startTime,
            endTime,
          );
          break;
        }

        case BOOKING_RESCHEDULED: {
          await this.handleBookingRescheduled(
            connection.id,
            bookingId,
            serviceName,
            clientName,
            job.data,
          );
          break;
        }

        case BOOKING_CANCELLED: {
          await this.handleBookingCancelled(connection.id, bookingId);
          break;
        }

        default:
          this.logger.log(
            `Unhandled event type for calendar push: ${eventType}`,
          );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Calendar push failed for booking ${bookingId}: ${message}`,
      );
      throw err; // Let BullMQ retry
    }
  }

  /**
   * Create a new Google Calendar event for a confirmed booking.
   */
  private async handleBookingConfirmed(
    connectionId: string,
    bookingId: string,
    serviceName: string,
    clientName: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const externalEventId = await this.calendarService.createEvent(
      connectionId,
      {
        summary: `${serviceName} — ${clientName}`,
        description: `SavSpot Booking: ${bookingId}\nService: ${serviceName}\nClient: ${clientName}\nView: ${process.env.WEB_URL || 'https://app.savspot.co'}/bookings/${bookingId}`,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    );

    // Link the CalendarEvent to the booking
    const calEvent = await this.prisma.calendarEvent.findFirst({
      where: {
        calendarConnectionId: connectionId,
        externalEventId,
      },
    });

    if (calEvent) {
      await this.prisma.calendarEvent.update({
        where: { id: calEvent.id },
        data: { bookingId },
      });
    }

    this.logger.log(
      `Calendar event created for booking ${bookingId}: ${externalEventId}`,
    );
  }

  /**
   * Update the Google Calendar event for a rescheduled booking.
   */
  private async handleBookingRescheduled(
    connectionId: string,
    bookingId: string,
    serviceName: string,
    clientName: string,
    data: CalendarEventPushJobData,
  ): Promise<void> {
    // Find the existing calendar event linked to this booking
    const calEvent = await this.prisma.calendarEvent.findFirst({
      where: {
        calendarConnectionId: connectionId,
        bookingId,
        direction: 'OUTBOUND',
      },
    });

    if (!calEvent || !calEvent.externalEventId) {
      // No existing event — create a new one instead
      this.logger.warn(
        `No existing calendar event for rescheduled booking ${bookingId} — creating new`,
      );
      const newStart = data.newStartTime || data.startTime;
      const newEnd = data.newEndTime || data.endTime;
      await this.handleBookingConfirmed(
        connectionId,
        bookingId,
        serviceName,
        clientName,
        newStart,
        newEnd,
      );
      return;
    }

    const newStartTime = data.newStartTime || data.startTime;
    const newEndTime = data.newEndTime || data.endTime;

    await this.calendarService.updateEvent(
      connectionId,
      calEvent.externalEventId,
      {
        summary: `${serviceName} — ${clientName}`,
        description: `SavSpot Booking: ${bookingId} (Rescheduled)\nService: ${serviceName}\nClient: ${clientName}\nView: ${process.env.WEB_URL || 'https://app.savspot.co'}/bookings/${bookingId}`,
        startTime: new Date(newStartTime),
        endTime: new Date(newEndTime),
      },
    );

    this.logger.log(
      `Calendar event updated for rescheduled booking ${bookingId}`,
    );
  }

  /**
   * Delete the Google Calendar event for a cancelled booking.
   */
  private async handleBookingCancelled(
    connectionId: string,
    bookingId: string,
  ): Promise<void> {
    const calEvent = await this.prisma.calendarEvent.findFirst({
      where: {
        calendarConnectionId: connectionId,
        bookingId,
        direction: 'OUTBOUND',
      },
    });

    if (!calEvent || !calEvent.externalEventId) {
      this.logger.log(
        `No calendar event found for cancelled booking ${bookingId} — nothing to delete`,
      );
      return;
    }

    await this.calendarService.deleteEvent(
      connectionId,
      calEvent.externalEventId,
    );

    this.logger.log(
      `Calendar event deleted for cancelled booking ${bookingId}`,
    );
  }
}
