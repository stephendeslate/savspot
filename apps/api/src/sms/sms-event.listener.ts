import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_PROVIDER_SMS,
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
export class SmsEventListener {
  private readonly logger = new Logger(SmsEventListener.name);

  constructor(
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  @OnEvent(BOOKING_CONFIRMED)
  async onBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    await this.enqueueSmsJob(BOOKING_CONFIRMED, payload);
  }

  @OnEvent(BOOKING_CANCELLED)
  async onBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    await this.enqueueSmsJob(BOOKING_CANCELLED, payload);
  }

  @OnEvent(BOOKING_RESCHEDULED)
  async onBookingRescheduled(
    payload: BookingRescheduledPayload,
  ): Promise<void> {
    await this.enqueueSmsJob(BOOKING_RESCHEDULED, payload, {
      previousStartTime: payload.previousStartTime.toISOString(),
      newStartTime: payload.newStartTime.toISOString(),
    });
  }

  @OnEvent(BOOKING_COMPLETED)
  async onBookingCompleted(payload: BookingEventPayload): Promise<void> {
    await this.enqueueSmsJob(BOOKING_COMPLETED, payload);
  }

  @OnEvent(BOOKING_NO_SHOW)
  async onBookingNoShow(payload: BookingEventPayload): Promise<void> {
    await this.enqueueSmsJob(BOOKING_NO_SHOW, payload);
  }

  private async enqueueSmsJob(
    eventType: string,
    payload: BookingEventPayload,
    extra?: { previousStartTime?: string; newStartTime?: string },
  ): Promise<void> {
    this.logger.log(
      `Enqueuing provider SMS for ${eventType} — booking ${payload.bookingId}`,
    );

    await this.commsQueue.add(JOB_DELIVER_PROVIDER_SMS, {
      tenantId: payload.tenantId,
      eventType,
      bookingData: {
        bookingId: payload.bookingId,
        clientName: payload.clientName,
        serviceName: payload.serviceName,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
        ...extra,
      },
    });
  }
}
