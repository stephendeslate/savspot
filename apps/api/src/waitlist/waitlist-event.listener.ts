import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BOOKING_CANCELLED,
  BookingCancelledPayload,
} from '../events/event.types';
import { WaitlistService } from './waitlist.service';
import { CommunicationsService } from '../communications/communications.service';

@Injectable()
export class WaitlistEventListener {
  private readonly logger = new Logger(WaitlistEventListener.name);

  constructor(
    private readonly waitlistService: WaitlistService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  @OnEvent(BOOKING_CANCELLED)
  async handleBookingCancelled(payload: BookingCancelledPayload) {
    try {
      // Try date-specific matches first
      const entries = await this.waitlistService.findMatchingEntries(
        payload.tenantId,
        payload.serviceId,
        payload.startTime,
      );

      if (entries.length === 0) {
        // Fall back to general waitlist entries (no date preference)
        const generalEntries = await this.waitlistService.findMatchingEntries(
          payload.tenantId,
          payload.serviceId,
        );

        if (generalEntries.length === 0) return;

        await this.notifyEntry(generalEntries[0]!, payload);
        return;
      }

      await this.notifyEntry(entries[0]!, payload);
    } catch (error) {
      this.logger.error(
        `Failed to process waitlist for cancelled booking ${payload.bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async notifyEntry(
    entry: {
      id: string;
      clientEmail: string;
      clientName: string;
      tenantId: string;
    },
    payload: BookingCancelledPayload,
  ) {
    try {
      await this.waitlistService.markNotified(entry.id);

      await this.communicationsService.createAndSend({
        tenantId: entry.tenantId,
        recipientId: entry.id,
        recipientEmail: entry.clientEmail,
        recipientName: entry.clientName,
        channel: 'EMAIL',
        templateKey: 'waitlist-slot-available',
        templateData: {
          serviceName: payload.serviceName,
          clientName: entry.clientName,
        },
        category: 'BOOKING',
        skipPreferenceCheck: true,
      });

      this.logger.log(
        `Waitlist notification sent to ${entry.clientEmail} for service ${payload.serviceName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send waitlist notification to ${entry.clientEmail}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
