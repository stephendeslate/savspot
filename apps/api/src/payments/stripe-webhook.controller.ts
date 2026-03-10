import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeProvider } from './providers/stripe.provider';

@ApiTags('Webhooks')
@Throttle({ default: { limit: 500, ttl: 60_000 } })
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly stripeProvider: StripeProvider,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    const connectWebhookSecret = this.configService.get<string>(
      'stripe.connectWebhookSecret',
    );

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Access the raw body buffer for signature verification
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body not available — ensure rawBody is enabled in NestFactory.create',
      );
    }

    // Try standard webhook secret first, then Connect webhook secret
    let event;
    const secret = webhookSecret || connectWebhookSecret;
    if (!secret) {
      this.logger.warn('No Stripe webhook secret configured — cannot verify');
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      event = this.stripeProvider.constructWebhookEvent(
        rawBody,
        signature,
        secret,
      );
    } catch {
      // If the first secret fails and we have a second one, try that
      if (webhookSecret && connectWebhookSecret && secret === webhookSecret) {
        try {
          event = this.stripeProvider.constructWebhookEvent(
            rawBody,
            signature,
            connectWebhookSecret,
          );
        } catch {
          this.logger.error('Webhook signature verification failed');
          throw new BadRequestException('Webhook signature verification failed');
        }
      } else {
        this.logger.error('Webhook signature verification failed');
        throw new BadRequestException('Webhook signature verification failed');
      }
    }

    // Idempotency check: skip if this event was already processed
    const existingLog = await this.prisma.paymentWebhookLog.findUnique({
      where: { eventId: event.id },
    });

    if (existingLog) {
      this.logger.log(
        `Duplicate webhook event ${event.id} (${event.type}) — skipping`,
      );
      return { received: true };
    }

    // Log the webhook event
    const logEntry = await this.logWebhookEvent(
      event.type,
      event.id,
      event.data.object as unknown as Record<string, unknown>,
    );

    try {
      await this.routeEvent(event);

      // Mark as processed
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

      // Record to dead letter table for manual review / retry
      await this.prisma.webhookDeadLetter.create({
        data: {
          webhookLogId: logEntry.id,
          finalError: errorMessage,
          retryCount: 0,
        },
      });

      this.logger.error(
        `Error processing webhook ${event.type}: ${errorMessage}`,
      );
      // Still return 200 to prevent Stripe retries for application-level errors
    }

    return { received: true };
  }

  /**
   * Route a Stripe event to the appropriate handler.
   */
  private async routeEvent(event: { type: string; data: { object: unknown } }) {
    const obj = event.data.object as Record<string, unknown>;

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntentId = obj['id'] as string;
        this.logger.log(`Payment intent succeeded: ${paymentIntentId}`);
        await this.paymentsService.handlePaymentSuccess(paymentIntentId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntentId = obj['id'] as string;
        const lastError = obj['last_payment_error'] as
          | Record<string, unknown>
          | undefined;
        const reason = (lastError?.['message'] as string) ?? 'Payment failed';
        this.logger.log(
          `Payment intent failed: ${paymentIntentId} — ${reason}`,
        );
        await this.paymentsService.handlePaymentFailure(
          paymentIntentId,
          reason,
        );
        break;
      }

      case 'account.updated': {
        const accountId = obj['id'] as string;
        this.logger.log(`Account updated: ${accountId}`);
        await this.stripeConnectService.handleAccountUpdate(accountId);
        break;
      }

      case 'charge.dispute.created': {
        const disputePaymentIntentId = obj['payment_intent'] as
          | string
          | undefined;
        if (disputePaymentIntentId) {
          this.logger.log(
            `Dispute created for payment intent: ${disputePaymentIntentId}`,
          );
          const disputedPayment = await this.prisma.payment.findFirst({
            where: { providerTransactionId: disputePaymentIntentId },
          });
          if (disputedPayment) {
            const previousStatus = disputedPayment.status;
            await this.prisma.payment.update({
              where: { id: disputedPayment.id },
              data: { status: 'DISPUTED' },
            });
            await this.prisma.paymentStateHistory.create({
              data: {
                paymentId: disputedPayment.id,
                tenantId: disputedPayment.tenantId,
                fromState: previousStatus,
                toState: 'DISPUTED',
                triggeredBy: 'WEBHOOK',
                reason: `Stripe dispute created (${obj['reason'] as string | undefined ?? 'no reason provided'})`,
              },
            });
          } else {
            this.logger.warn(
              `Payment not found for disputed payment intent: ${disputePaymentIntentId}`,
            );
          }
        }
        break;
      }

      case 'charge.dispute.closed': {
        const closedDisputePaymentIntentId = obj['payment_intent'] as
          | string
          | undefined;
        const disputeStatus = obj['status'] as string | undefined;
        if (closedDisputePaymentIntentId) {
          this.logger.log(
            `Dispute closed (${disputeStatus}) for payment intent: ${closedDisputePaymentIntentId}`,
          );
          const closedDisputePayment = await this.prisma.payment.findFirst({
            where: { providerTransactionId: closedDisputePaymentIntentId },
          });
          if (closedDisputePayment) {
            const previousStatus = closedDisputePayment.status;
            const newStatus = disputeStatus === 'won' ? 'SUCCEEDED' : 'REFUNDED';
            await this.prisma.payment.update({
              where: { id: closedDisputePayment.id },
              data: { status: newStatus },
            });
            await this.prisma.paymentStateHistory.create({
              data: {
                paymentId: closedDisputePayment.id,
                tenantId: closedDisputePayment.tenantId,
                fromState: previousStatus,
                toState: newStatus,
                triggeredBy: 'WEBHOOK',
                reason: `Stripe dispute closed with status: ${disputeStatus}`,
              },
            });
          } else {
            this.logger.warn(
              `Payment not found for closed dispute payment intent: ${closedDisputePaymentIntentId}`,
            );
          }
        }
        break;
      }

      case 'charge.refunded': {
        const paymentIntentId = obj['payment_intent'] as string | undefined;
        if (paymentIntentId) {
          this.logger.log(
            `Charge refunded for payment intent: ${paymentIntentId}`,
          );
          // Refund confirmation — the refund is already processed via our API.
          // This webhook confirms the refund on Stripe's side.
          // We could re-check status, but it's mostly informational.
        }
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Log a webhook event to the PaymentWebhookLog table.
   */
  private async logWebhookEvent(
    eventType: string,
    eventId: string,
    payload: Record<string, unknown>,
  ) {
    return this.prisma.paymentWebhookLog.create({
      data: {
        gateway: 'STRIPE',
        eventType,
        eventId,
        rawData: payload as Prisma.InputJsonValue,
        processed: false,
      },
    });
  }
}
