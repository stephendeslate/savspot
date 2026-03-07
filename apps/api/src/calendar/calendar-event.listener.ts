import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  BOOKING_CONFIRMED,
  BOOKING_RESCHEDULED,
  BOOKING_CANCELLED,
  BookingEventPayload,
  BookingRescheduledPayload,
  BookingCancelledPayload,
} from '../events/event.types';
import { QUEUE_CALENDAR, JOB_CALENDAR_EVENT_PUSH } from '../bullmq/queue.constants';

/**
 * Listens to booking domain events and enqueues calendar push jobs.
 * Each active calendar connection for the tenant gets a separate push job.
 */
@Injectable()
export class CalendarEventListener {
  private readonly logger = new Logger(CalendarEventListener.name);

  constructor(
    @InjectQueue(QUEUE_CALENDAR) private readonly calendarQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(BOOKING_CONFIRMED)
  async onBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    const connections = await this.getActiveConnections(payload.tenantId);
    if (connections.length === 0) return;

    for (const conn of connections) {
      await this.calendarQueue.add(JOB_CALENDAR_EVENT_PUSH, {
        eventType: BOOKING_CONFIRMED,
        connectionId: conn.id,
        tenantId: payload.tenantId,
        bookingId: payload.bookingId,
        serviceName: payload.serviceName,
        clientName: payload.clientName,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
      });
    }

    this.logger.log(
      `Enqueued ${connections.length} calendar push job(s) for confirmed booking ${payload.bookingId}`,
    );
  }

  @OnEvent(BOOKING_RESCHEDULED)
  async onBookingRescheduled(payload: BookingRescheduledPayload): Promise<void> {
    const connections = await this.getActiveConnections(payload.tenantId);
    if (connections.length === 0) return;

    for (const conn of connections) {
      await this.calendarQueue.add(JOB_CALENDAR_EVENT_PUSH, {
        eventType: BOOKING_RESCHEDULED,
        connectionId: conn.id,
        tenantId: payload.tenantId,
        bookingId: payload.bookingId,
        serviceName: payload.serviceName,
        clientName: payload.clientName,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
        previousStartTime: payload.previousStartTime.toISOString(),
        previousEndTime: payload.previousEndTime.toISOString(),
        newStartTime: payload.newStartTime.toISOString(),
        newEndTime: payload.newEndTime.toISOString(),
      });
    }

    this.logger.log(
      `Enqueued ${connections.length} calendar push job(s) for rescheduled booking ${payload.bookingId}`,
    );
  }

  @OnEvent(BOOKING_CANCELLED)
  async onBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    const connections = await this.getActiveConnections(payload.tenantId);
    if (connections.length === 0) return;

    for (const conn of connections) {
      await this.calendarQueue.add(JOB_CALENDAR_EVENT_PUSH, {
        eventType: BOOKING_CANCELLED,
        connectionId: conn.id,
        tenantId: payload.tenantId,
        bookingId: payload.bookingId,
        serviceName: payload.serviceName,
        clientName: payload.clientName,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
      });
    }

    this.logger.log(
      `Enqueued ${connections.length} calendar push job(s) for cancelled booking ${payload.bookingId}`,
    );
  }

  private async getActiveConnections(tenantId: string) {
    return this.prisma.calendarConnection.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true },
    });
  }
}
