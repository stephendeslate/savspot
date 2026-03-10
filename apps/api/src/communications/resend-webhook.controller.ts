import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Resend webhook event shape (simplified).
 * See https://resend.com/docs/dashboard/webhooks/introduction
 */
interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

/**
 * Handles Resend email delivery webhooks to update Communication records
 * with delivery/open/bounce status.
 *
 * Configure the webhook URL in Resend dashboard:
 *   POST https://<api-domain>/webhooks/resend
 */
@Throttle({ default: { limit: 500, ttl: 60_000 } })
@Controller('webhooks')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('resend')
  @HttpCode(200)
  async handleResendWebhook(@Body() event: ResendWebhookEvent): Promise<{ received: boolean }> {
    try {
      const emailId = event?.data?.email_id;
      if (!emailId) {
        this.logger.warn('Resend webhook received without email_id');
        return { received: true };
      }

      this.logger.log(`Resend webhook: type=${event.type} email_id=${emailId}`);

      switch (event.type) {
        case 'email.delivered':
          await this.prisma.communication.updateMany({
            where: { providerMessageId: emailId },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
            },
          });
          break;

        case 'email.opened':
          // Don't change status from DELIVERED — just record the open timestamp
          await this.prisma.communication.updateMany({
            where: { providerMessageId: emailId },
            data: {
              openedAt: new Date(),
            },
          });
          break;

        case 'email.bounced':
          await this.prisma.communication.updateMany({
            where: { providerMessageId: emailId },
            data: {
              status: 'BOUNCED',
            },
          });
          break;

        case 'email.complained':
          await this.prisma.communication.updateMany({
            where: { providerMessageId: emailId },
            data: {
              status: 'FAILED',
              failureReason: 'Spam complaint received',
            },
          });
          break;

        default:
          this.logger.debug(`Unhandled Resend webhook event type: ${event.type}`);
      }
    } catch (error) {
      // Log but don't throw — return 200 to prevent Resend retries
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing Resend webhook: ${message}`);

      // Record to dead letter table for manual review / retry
      try {
        const webhookLog = await this.prisma.paymentWebhookLog.create({
          data: {
            gateway: 'RESEND',
            eventType: event?.type ?? 'unknown',
            eventId: `resend_${event?.data?.email_id ?? Date.now()}`,
            rawData: (event ?? {}) as unknown as Prisma.InputJsonValue,
            processed: false,
            processingError: message,
          },
        });

        await this.prisma.webhookDeadLetter.create({
          data: {
            webhookLogId: webhookLog.id,
            finalError: message,
            retryCount: 0,
          },
        });
      } catch (dlErr) {
        const dlMessage = dlErr instanceof Error ? dlErr.message : String(dlErr);
        this.logger.error(`Failed to record dead letter: ${dlMessage}`);
      }
    }

    return { received: true };
  }
}
