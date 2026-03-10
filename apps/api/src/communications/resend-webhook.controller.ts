import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
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
    }

    return { received: true };
  }
}
