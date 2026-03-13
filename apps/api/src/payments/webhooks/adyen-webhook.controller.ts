import * as crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from '../payments.service';

interface AdyenNotificationItem {
  NotificationRequestItem: {
    eventCode: string;
    pspReference: string;
    merchantAccountCode: string;
    merchantReference: string;
    amount: { value: number; currency: string };
    success: string;
    reason?: string;
    additionalData?: Record<string, string>;
  };
}

interface AdyenWebhookBody {
  live: string;
  notificationItems: AdyenNotificationItem[];
}

@ApiTags('Webhooks')
@Throttle({ default: { limit: 500, ttl: 60_000 } })
@Controller('webhooks/adyen')
export class AdyenWebhookController {
  private readonly logger = new Logger(AdyenWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Adyen webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Body() body: AdyenWebhookBody,
    @Headers('hmac-signature') hmacSignature: string | undefined,
  ) {
    if (process.env['FEATURE_PAYMENT_ADYEN'] !== 'true') {
      throw new BadRequestException('Adyen payment provider is not enabled');
    }

    this.verifyHmacSignature(hmacSignature, JSON.stringify(body));

    for (const item of body.notificationItems) {
      const notification = item.NotificationRequestItem;

      const existingLog = await this.prisma.paymentWebhookLog.findUnique({
        where: { eventId: notification.pspReference },
      });

      if (existingLog) {
        this.logger.log(
          `Duplicate Adyen webhook ${notification.pspReference} (${notification.eventCode}) — skipping`,
        );
        continue;
      }

      const logEntry = await this.logWebhookEvent(
        notification.eventCode,
        notification.pspReference,
        notification as unknown as Record<string, unknown>,
      );

      try {
        await this.routeEvent(notification);

        await this.prisma.paymentWebhookLog.update({
          where: { id: logEntry.id },
          data: { processed: true },
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';

        await this.prisma.paymentWebhookLog.update({
          where: { id: logEntry.id },
          data: { processingError: errorMessage },
        });

        await this.prisma.webhookDeadLetter.create({
          data: {
            webhookLogId: logEntry.id,
            finalError: errorMessage,
            retryCount: 0,
          },
        });

        this.logger.error(
          `Error processing Adyen webhook ${notification.eventCode}: ${errorMessage}`,
        );
      }
    }

    return '[accepted]';
  }

  private verifyHmacSignature(
    signature: string | undefined,
    payload: string,
  ): void {
    const hmacKey = process.env['ADYEN_HMAC_KEY'];
    if (!hmacKey) {
      this.logger.warn(
        'No ADYEN_HMAC_KEY configured — skipping HMAC verification',
      );
      return;
    }
    if (!signature) {
      throw new BadRequestException('Missing HMAC signature header');
    }
    const keyBuffer = Buffer.from(hmacKey, 'hex');
    const computedBuffer = Buffer.from(
      crypto.createHmac('sha256', keyBuffer).update(payload).digest('base64'),
    );
    const signatureBuffer = Buffer.from(signature);
    if (
      computedBuffer.length !== signatureBuffer.length ||
      !timingSafeEqual(computedBuffer, signatureBuffer)
    ) {
      throw new BadRequestException('Invalid HMAC signature');
    }
  }

  private async routeEvent(
    notification: AdyenNotificationItem['NotificationRequestItem'],
  ): Promise<void> {
    const isSuccess = notification.success === 'true';

    switch (notification.eventCode) {
      case 'AUTHORISATION': {
        this.logger.log(
          `Adyen AUTHORISATION for ${notification.pspReference} — success: ${isSuccess}`,
        );
        if (isSuccess) {
          await this.paymentsService.handlePaymentSuccess(
            notification.pspReference,
          );
        } else {
          await this.paymentsService.handlePaymentFailure(
            notification.pspReference,
            notification.reason ?? 'Adyen authorisation failed',
          );
        }
        break;
      }

      case 'CAPTURE': {
        this.logger.log(
          `Adyen CAPTURE for ${notification.pspReference} — success: ${isSuccess}`,
        );
        if (isSuccess) {
          await this.paymentsService.handlePaymentSuccess(
            notification.pspReference,
          );
        }
        break;
      }

      case 'REFUND': {
        this.logger.log(
          `Adyen REFUND for ${notification.pspReference} — success: ${isSuccess}`,
        );
        if (isSuccess) {
          const payment = await this.prisma.payment.findFirst({
            where: { providerTransactionId: notification.pspReference },
          });
          if (payment) {
            const previousStatus = payment.status;
            await this.prisma.$transaction([
              this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUNDED' },
              }),
              this.prisma.paymentStateHistory.create({
                data: {
                  paymentId: payment.id,
                  tenantId: payment.tenantId,
                  fromState: previousStatus,
                  toState: 'REFUNDED',
                  triggeredBy: 'WEBHOOK',
                  reason: 'Adyen refund webhook confirmation',
                },
              }),
            ]);
          }
        }
        break;
      }

      case 'ACCOUNT_HOLDER_VERIFICATION': {
        this.logger.log(
          `Adyen ACCOUNT_HOLDER_VERIFICATION for merchant ${notification.merchantAccountCode}`,
        );
        if (notification.merchantAccountCode) {
          await this.prisma.tenant.updateMany({
            where: {
              paymentProviderAccountId: notification.merchantAccountCode,
            },
            data: { paymentProviderOnboarded: true },
          });
        }
        break;
      }

      default:
        this.logger.log(
          `Unhandled Adyen webhook event: ${notification.eventCode}`,
        );
    }
  }

  private async logWebhookEvent(
    eventType: string,
    eventId: string,
    payload: Record<string, unknown>,
  ) {
    return this.prisma.paymentWebhookLog.create({
      data: {
        gateway: 'ADYEN',
        eventType,
        eventId,
        rawData: payload as Prisma.InputJsonValue,
        processed: false,
      },
    });
  }
}
