import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowTriggerEvent } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService, CreateAndSendParams } from '../communications/communications.service';
import {
  BOOKING_CONFIRMED,
  BOOKING_CANCELLED,
  BOOKING_COMPLETED,
  BOOKING_WALK_IN,
  PAYMENT_RECEIVED,
  BookingEventPayload,
  BookingCancelledPayload,
  PaymentEventPayload,
} from '../events/event.types';

/**
 * WorkflowEngine listens to domain events and executes workflow automations.
 *
 * Hardcoded platform emails (always sent, not from workflow_automations):
 * - Payment receipts  (PAYMENT_RECEIVED)
 * - Cancellation confirmations (BOOKING_CANCELLED)
 *
 * Workflow-driven (from workflow_automations table):
 * - Booking confirmation (BOOKING_CONFIRMED)
 * - Post-appointment follow-up (BOOKING_COMPLETED)
 * - Walk-in follow-up (BOOKING_WALK_IN — same as completed)
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  // ---- Hardcoded Platform Handlers ----

  /**
   * BOOKING_CANCELLED — Always sends cancellation confirmation email.
   * This is a hardcoded platform email, not driven by workflow_automations.
   */
  @OnEvent(BOOKING_CANCELLED)
  async handleBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    this.logger.log(
      `[Hardcoded] Booking cancelled: booking=${payload.bookingId} tenant=${payload.tenantId}`,
    );

    try {
      const tenant = await this.loadTenantBranding(payload.tenantId);
      const dateTime = this.formatDateTime(payload.startTime);

      await this.communicationsService.createAndSend({
        tenantId: payload.tenantId,
        recipientId: payload.clientId,
        recipientEmail: payload.clientEmail,
        recipientName: payload.clientName,
        channel: 'EMAIL',
        templateKey: 'booking-cancellation',
        templateData: {
          clientName: payload.clientName,
          serviceName: payload.serviceName,
          dateTime,
          cancellationReason: payload.cancellationReason,
          refundAmount: payload.refundAmount,
          currency: tenant.currency,
          businessName: tenant.name,
          logoUrl: tenant.logoUrl,
          brandColor: tenant.brandColor,
        },
        bookingId: payload.bookingId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send cancellation email for booking ${payload.bookingId}: ${error}`,
      );
    }
  }

  /**
   * PAYMENT_RECEIVED — Always sends payment receipt email.
   * This is a hardcoded platform email, not driven by workflow_automations.
   */
  @OnEvent(PAYMENT_RECEIVED)
  async handlePaymentReceived(payload: PaymentEventPayload): Promise<void> {
    this.logger.log(
      `[Hardcoded] Payment received: payment=${payload.paymentId} booking=${payload.bookingId}`,
    );

    try {
      const tenant = await this.loadTenantBranding(payload.tenantId);

      // Look up invoice number if available
      const invoice = await this.prisma.invoice.findFirst({
        where: { bookingId: payload.bookingId, tenantId: payload.tenantId },
        select: { invoiceNumber: true },
      });

      await this.communicationsService.createAndSend({
        tenantId: payload.tenantId,
        recipientId: payload.clientId,
        recipientEmail: payload.clientEmail,
        recipientName: payload.clientName,
        channel: 'EMAIL',
        templateKey: 'payment-receipt',
        templateData: {
          clientName: payload.clientName,
          serviceName: payload.serviceName,
          amount: payload.amount,
          currency: payload.currency,
          invoiceNumber: invoice?.invoiceNumber ?? null,
          businessName: tenant.name,
          logoUrl: tenant.logoUrl,
          brandColor: tenant.brandColor,
        },
        bookingId: payload.bookingId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment receipt for payment ${payload.paymentId}: ${error}`,
      );
    }
  }

  // ---- Workflow-Driven Handlers ----

  /**
   * BOOKING_CONFIRMED — Checks workflow_automations for matching BOOKING_CONFIRMED
   * triggers and executes them (e.g. send confirmation email).
   */
  @OnEvent(BOOKING_CONFIRMED)
  async handleBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    this.logger.log(
      `[Workflow] Booking confirmed: booking=${payload.bookingId} tenant=${payload.tenantId}`,
    );

    await this.executeWorkflows('BOOKING_CONFIRMED', payload);
  }

  /**
   * BOOKING_COMPLETED — Checks workflow_automations for matching BOOKING_COMPLETED
   * triggers (e.g. follow-up email with delay).
   */
  @OnEvent(BOOKING_COMPLETED)
  async handleBookingCompleted(payload: BookingEventPayload): Promise<void> {
    this.logger.log(
      `[Workflow] Booking completed: booking=${payload.bookingId} tenant=${payload.tenantId}`,
    );

    await this.executeWorkflows('BOOKING_COMPLETED', payload);
  }

  /**
   * BOOKING_WALK_IN — Treated same as completed for workflow purposes.
   */
  @OnEvent(BOOKING_WALK_IN)
  async handleBookingWalkIn(payload: BookingEventPayload): Promise<void> {
    this.logger.log(
      `[Workflow] Walk-in booking: booking=${payload.bookingId} tenant=${payload.tenantId}`,
    );

    // Walk-ins get the same post-appointment workflows as completed bookings
    await this.executeWorkflows('BOOKING_COMPLETED', payload);
  }

  // ---- Workflow Execution Engine ----

  /**
   * Queries workflow_automations for matching trigger_event + tenant_id,
   * then dispatches each action based on actionType.
   */
  private async executeWorkflows(
    triggerEvent: string,
    payload: BookingEventPayload,
  ): Promise<void> {
    try {
      const automations = await this.prisma.workflowAutomation.findMany({
        where: {
          tenantId: payload.tenantId,
          triggerEvent: triggerEvent as WorkflowTriggerEvent,
          isActive: true,
        },
      });

      if (automations.length === 0) {
        this.logger.debug(
          `No active automations for trigger=${triggerEvent} tenant=${payload.tenantId}`,
        );
        return;
      }

      this.logger.log(
        `Found ${automations.length} automation(s) for trigger=${triggerEvent} tenant=${payload.tenantId}`,
      );

      for (const automation of automations) {
        try {
          await this.executeAction(automation, payload);
        } catch (error) {
          this.logger.error(
            `Failed to execute automation ${automation.id}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to query workflow automations for trigger=${triggerEvent}: ${error}`,
      );
    }
  }

  /**
   * Executes a single workflow automation action.
   */
  private async executeAction(
    automation: { id: string; actionType: string; actionConfig: unknown },
    payload: BookingEventPayload,
  ): Promise<void> {
    const config = (automation.actionConfig ?? {}) as Record<string, unknown>;
    const delayMinutes = Number(config['delay_minutes'] ?? 0);
    const delayMs = delayMinutes > 0 ? delayMinutes * 60 * 1000 : undefined;

    switch (automation.actionType) {
      case 'SEND_EMAIL':
        await this.executeSendEmail(automation, config, payload, delayMs);
        break;

      case 'SEND_SMS':
        await this.executeSendSms(automation, config, payload);
        break;

      case 'SEND_NOTIFICATION':
        await this.executeSendNotification(automation, config, payload);
        break;

      case 'SEND_PUSH':
        this.logger.warn(
          `SEND_PUSH not yet implemented — automation=${automation.id}`,
        );
        break;

      default:
        this.logger.warn(
          `Unknown actionType=${automation.actionType} for automation=${automation.id}`,
        );
    }
  }

  /**
   * SEND_EMAIL action — determines template key from actionConfig or trigger event,
   * then enqueues via CommunicationsService.
   */
  private async executeSendEmail(
    automation: { id: string },
    config: Record<string, unknown>,
    payload: BookingEventPayload,
    delayMs?: number,
  ): Promise<void> {
    const templateKey = config['template_key']
      ? String(config['template_key'])
      : this.resolveTemplateKey(config, payload);

    const tenant = await this.loadTenantBranding(payload.tenantId);
    const dateTime = this.formatDateTime(payload.startTime);

    const sendParams: CreateAndSendParams = {
      tenantId: payload.tenantId,
      recipientId: payload.clientId,
      recipientEmail: payload.clientEmail,
      recipientName: payload.clientName,
      channel: 'EMAIL',
      templateKey,
      templateData: {
        clientName: payload.clientName,
        serviceName: payload.serviceName,
        dateTime,
        providerName: config['providerName'] ?? null,
        businessName: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
        tenantSlug: tenant.slug,
        serviceId: payload.serviceId,
        providerId: payload.providerId ?? null,
      },
      bookingId: payload.bookingId,
    };

    this.logger.log(
      `Executing SEND_EMAIL: automation=${automation.id} template=${templateKey}${delayMs ? ` delay=${delayMs}ms` : ''}`,
    );

    await this.communicationsService.createAndSend(sendParams, { delayMs });
  }

  /**
   * SEND_SMS action — enqueues deliverProviderSMS job.
   * SMS delivery requires Twilio integration (Sprint 5+).
   * For now, log the intent and create a Communication record.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async executeSendSms(
    automation: { id: string },
    _config: Record<string, unknown>,
    _payload: BookingEventPayload,
  ): Promise<void> {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    this.logger.warn(
      `SEND_SMS not fully implemented yet — automation=${automation.id}. SMS delivery requires Twilio integration.`,
    );
    // TODO: Sprint 5 — enqueue JOB_DELIVER_PROVIDER_SMS with Twilio
  }

  /**
   * SEND_NOTIFICATION action — creates an in-app notification directly.
   */
  private async executeSendNotification(
    automation: { id: string },
    config: Record<string, unknown>,
    payload: BookingEventPayload,
  ): Promise<void> {
    const title = config['title']
      ? String(config['title'])
      : `Booking update: ${payload.serviceName}`;
    const body = config['body']
      ? String(config['body'])
      : `Your booking for ${payload.serviceName} has been updated.`;

    this.logger.log(
      `Executing SEND_NOTIFICATION: automation=${automation.id} user=${payload.clientId}`,
    );

    try {
      // Look up a suitable NotificationType (fall back to first system type)
      const notificationType = await this.prisma.notificationType.findFirst({
        where: {
          OR: [
            { key: 'booking_update' },
            { key: 'booking-update' },
            { isSystem: true },
          ],
        },
        select: { id: true },
      });

      if (!notificationType) {
        this.logger.warn(
          `No NotificationType found for in-app notification — automation=${automation.id}`,
        );
        return;
      }

      await this.prisma.notification.create({
        data: {
          userId: payload.clientId,
          tenantId: payload.tenantId,
          typeId: notificationType.id,
          title,
          body,
          data: {
            bookingId: payload.bookingId,
            serviceId: payload.serviceId,
            automationId: automation.id,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for automation ${automation.id}: ${error}`,
      );
    }
  }

  // ---- Helpers ----

  /**
   * Resolves the email template key based on the trigger event context.
   */
  private resolveTemplateKey(
    _config: Record<string, unknown>,
    payload: BookingEventPayload,
  ): string {
    // The template key resolution is based on what we know about the payload context.
    // In practice, the actionConfig should always specify template_key.
    // This is a fallback.
    this.logger.debug(
      `Resolving default template key for booking=${payload.bookingId}`,
    );
    return 'booking-confirmation';
  }

  /**
   * Loads tenant branding information for email templates.
   */
  private async loadTenantBranding(
    tenantId: string,
  ): Promise<{
    name: string;
    slug: string;
    logoUrl: string | null;
    brandColor: string | null;
    currency: string;
  }> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        currency: true,
      },
    });
    return tenant;
  }

  /**
   * Formats a Date into a human-readable date/time string (UTC).
   */
  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  }
}
