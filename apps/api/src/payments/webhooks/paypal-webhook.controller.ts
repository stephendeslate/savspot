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
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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

    await this.verifyWebhookSignature(
      {
        transmissionId,
        transmissionSig,
        certUrl,
        transmissionTime,
        authAlgo,
      },
      body,
    );

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

  private async verifyWebhookSignature(
    headers: {
      transmissionId: string | undefined;
      transmissionSig: string | undefined;
      certUrl: string | undefined;
      transmissionTime: string | undefined;
      authAlgo: string | undefined;
    },
    webhookBody: PaypalWebhookBody,
  ): Promise<void> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    if (!clientId || !clientSecret || !webhookId) {
      throw new BadRequestException('Webhook signature verification unavailable');
    }

    if (!headers.transmissionId || !headers.transmissionSig) {
      throw new BadRequestException('Missing PayPal signature headers');
    }

    const baseUrl =
      this.configService.get<string>('PAYPAL_API_URL') || 'https://api-m.paypal.com';

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      this.logger.error(
        `PayPal OAuth token request failed: ${tokenResponse.status}`,
      );
      throw new BadRequestException('PayPal webhook verification failed');
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
    };

    const verifyResponse = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: headers.authAlgo,
          cert_url: headers.certUrl,
          transmission_id: headers.transmissionId,
          transmission_sig: headers.transmissionSig,
          transmission_time: headers.transmissionTime,
          webhook_id: webhookId,
          webhook_event: webhookBody,
        }),
      },
    );

    if (!verifyResponse.ok) {
      this.logger.error(
        `PayPal verify-webhook-signature request failed: ${verifyResponse.status}`,
      );
      throw new BadRequestException('PayPal webhook verification failed');
    }

    const verifyData = (await verifyResponse.json()) as {
      verification_status: string;
    };

    if (verifyData.verification_status !== 'SUCCESS') {
      this.logger.warn(
        `PayPal webhook signature verification failed: ${verifyData.verification_status}`,
      );
      throw new BadRequestException('Invalid PayPal webhook signature');
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
        const payment = await this.prisma.payment.findFirst({
          where: { providerTransactionId: captureId },
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
                reason: 'PayPal refund webhook confirmation',
              },
            }),
          ]);
        }
        break;
      }

      case 'MERCHANT.ONBOARDING.COMPLETED': {
        const merchantId = event.resource.merchant_id;
        this.logger.log(
          `PayPal MERCHANT.ONBOARDING.COMPLETED for merchant ${merchantId}`,
        );
        if (merchantId) {
          await this.prisma.tenant.updateMany({
            where: { paymentProviderAccountId: merchantId },
            data: { paymentProviderOnboarded: true },
          });
        }
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
