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

interface PaypalWebhookBody {
  id: string;
  event_type: string;
  resource_type: string;
  resource: {
    id: string;
    status?: string;
    amount?: { value: string; currency_code: string };
    seller_receivable_breakdown?: {
      gross_amount: { value: string; currency_code: string };
      paypal_fee: { value: string; currency_code: string };
      net_amount: { value: string; currency_code: string };
    };
    merchant_id?: string;
    tracking_id?: string;
    [key: string]: unknown;
  };
  summary: string;
  create_time: string;
}

@ApiTags('Webhooks')
@Throttle({ default: { limit: 500, ttl: 60_000 } })
@Controller('webhooks/paypal')
export class PaypalWebhookController {
  private readonly logger = new Logger(PaypalWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'PayPal webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Body() body: PaypalWebhookBody,
    @Headers('paypal-transmission-id') transmissionId: string | undefined,
    @Headers('paypal-transmission-sig') transmissionSig: string | undefined,
    @Headers('paypal-cert-url') certUrl: string | undefined,
    @Headers('paypal-transmission-time') transmissionTime: string | undefined,
    @Headers('paypal-auth-algo') authAlgo: string | undefined,
  ) {
    if (process.env['FEATURE_PAYMENT_PAYPAL'] !== 'true') {
      throw new BadRequestException('PayPal payment provider is not enabled');
    }

    // TODO: Replace with real PayPal webhook signature verification
    this.verifyWebhookSignature({
      transmissionId,
      transmissionSig,
      certUrl,
      transmissionTime,
      authAlgo,
    });

    const existingLog = await this.prisma.paymentWebhookLog.findUnique({
      where: { eventId: body.id },
    });

    if (existingLog) {
      this.logger.log(
        `Duplicate PayPal webhook ${body.id} (${body.event_type}) — skipping`,
      );
      return { received: true };
    }

    const logEntry = await this.logWebhookEvent(
      body.event_type,
      body.id,
      body as unknown as Record<string, unknown>,
    );

    try {
      await this.routeEvent(body);

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
        `Error processing PayPal webhook ${body.event_type}: ${errorMessage}`,
      );
    }

    return { received: true };
  }

  private verifyWebhookSignature(headers: {
    transmissionId: string | undefined;
    transmissionSig: string | undefined;
    certUrl: string | undefined;
    transmissionTime: string | undefined;
    authAlgo: string | undefined;
  }): void {
    // TODO: Implement real PayPal webhook signature verification
    // 1. Retrieve webhook ID from config: this.configService.get('paypal.webhookId')
    // 2. POST /v1/notifications/verify-webhook-signature with:
    //    - transmission_id, transmission_sig, cert_url, transmission_time, auth_algo
    //    - webhook_id, webhook_event (body)
    // 3. Check verification_status === 'SUCCESS'
    if (!headers.transmissionId || !headers.transmissionSig) {
      this.logger.warn(
        '[STUB] Missing PayPal signature headers — skipping verification',
      );
    } else {
      this.logger.log('[STUB] PayPal webhook signature verification passed (stub)');
    }
  }

  private async routeEvent(event: PaypalWebhookBody): Promise<void> {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = event.resource.id;
        this.logger.log(
          `PayPal PAYMENT.CAPTURE.COMPLETED for capture ${captureId}`,
        );
        await this.paymentsService.handlePaymentSuccess(captureId);
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const captureId = event.resource.id;
        this.logger.log(
          `PayPal PAYMENT.CAPTURE.REFUNDED for capture ${captureId}`,
        );
        // TODO: Handle refund confirmation
        // Extract refund details from event.resource and update payment status
        break;
      }

      case 'MERCHANT.ONBOARDING.COMPLETED': {
        const merchantId = event.resource.merchant_id;
        this.logger.log(
          `PayPal MERCHANT.ONBOARDING.COMPLETED for merchant ${merchantId}`,
        );
        // TODO: Handle merchant onboarding completion
        // Update tenant's paymentProviderOnboarded to true
        // where paymentProviderAccountId === merchantId
        break;
      }

      default:
        this.logger.log(
          `Unhandled PayPal webhook event: ${event.event_type}`,
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
        gateway: 'PAYPAL',
        eventType,
        eventId,
        rawData: payload as Prisma.InputJsonValue,
        processed: false,
      },
    });
  }
}
