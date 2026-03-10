import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_BROWSER_PUSH,
} from '../bullmq/queue.constants';
import {
  BOOKING_CONFIRMED,
  BOOKING_CANCELLED,
  BOOKING_RESCHEDULED,
  BOOKING_COMPLETED,
  BOOKING_NO_SHOW,
  BookingEventPayload,
  BookingCancelledPayload,
  BookingRescheduledPayload,
} from '../events/event.types';

@Injectable()
export class BrowserPushEventListener {
  private readonly logger = new Logger(BrowserPushEventListener.name);

  constructor(
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  @OnEvent(BOOKING_CONFIRMED)
  async onBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    await this.enqueuePushJob(payload, {
      title: 'Booking Confirmed',
      body: `${payload.clientName} booked ${payload.serviceName}`,
    });
  }

  @OnEvent(BOOKING_CANCELLED)
  async onBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    await this.enqueuePushJob(payload, {
      title: 'Booking Cancelled',
      body: `${payload.clientName} cancelled ${payload.serviceName}`,
    });
  }

  @OnEvent(BOOKING_RESCHEDULED)
  async onBookingRescheduled(
    payload: BookingRescheduledPayload,
  ): Promise<void> {
    await this.enqueuePushJob(payload, {
      title: 'Booking Rescheduled',
      body: `${payload.clientName} rescheduled ${payload.serviceName}`,
    });
  }

  @OnEvent(BOOKING_COMPLETED)
  async onBookingCompleted(payload: BookingEventPayload): Promise<void> {
    await this.enqueuePushJob(payload, {
      title: 'Booking Completed',
      body: `${payload.clientName} completed ${payload.serviceName}`,
    });
  }

  @OnEvent(BOOKING_NO_SHOW)
  async onBookingNoShow(payload: BookingEventPayload): Promise<void> {
    await this.enqueuePushJob(payload, {
      title: 'No-Show',
      body: `${payload.clientName} was a no-show for ${payload.serviceName}`,
    });
  }

  private async enqueuePushJob(
    payload: BookingEventPayload,
    notification: { title: string; body: string },
  ): Promise<void> {
    this.logger.log(
      `Enqueuing browser push for "${notification.title}" — booking ${payload.bookingId}`,
    );

    await this.commsQueue.add(JOB_DELIVER_BROWSER_PUSH, {
      tenantId: payload.tenantId,
      title: notification.title,
      body: notification.body,
      data: {
        bookingId: payload.bookingId,
        actionUrl: `/bookings/${payload.bookingId}`,
      },
    });
  }
}
