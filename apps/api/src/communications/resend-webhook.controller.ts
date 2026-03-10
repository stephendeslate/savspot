import {
  Controller,
  Post,
  Body,
  Req,
  Logger,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Webhook } from 'svix';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('resend')
  @HttpCode(200)
  async handleResendWebhook(
    @Req() req: Request,
    @Body() event: ResendWebhookEvent,
  ): Promise<{ received: boolean }> {
    const secret = this.configService.get<string>('RESEND_WEBHOOK_SECRET');
    if (secret) {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        this.logger.error(
          'Raw body not available — ensure rawBody is enabled in NestFactory.create',
        );
        throw new HttpException('Webhook verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const headers = {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      };

      try {
        const wh = new Webhook(secret);
        wh.verify(rawBody.toString(), headers);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Resend webhook signature verification failed: ${message}`);
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }
    } else {
      this.logger.warn(
        'RESEND_WEBHOOK_SECRET not configured — skipping signature verification',
      );
    }

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
