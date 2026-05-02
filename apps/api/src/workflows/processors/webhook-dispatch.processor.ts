import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../services/webhook.service';

export interface WebhookDispatchJobData {
  deliveryId: string;
}

const RETRY_DELAYS_MS = [
  60_000,       // 1 minute
  300_000,      // 5 minutes
  1_800_000,    // 30 minutes
  7_200_000,    // 2 hours
  43_200_000,   // 12 hours
];

const CIRCUIT_BREAKER_THRESHOLD = 10;

@Injectable()
export class WebhookDispatchHandler {
  private readonly logger = new Logger(WebhookDispatchHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async handle(data: WebhookDispatchJobData): Promise<void> {
    const { deliveryId } = data;

    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });

    if (!delivery) {
      this.logger.warn(`Delivery ${deliveryId} not found — skipping`);
      return;
    }

    if (!delivery.endpoint.isActive) {
      this.logger.warn(
        `Endpoint ${delivery.endpoint.id} is disabled — skipping delivery ${deliveryId}`,
      );
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(delivery.payload);
    const decryptedSecret = this.webhookService.decryptSecret(
      delivery.endpoint.secret,
    );
    const signature = this.sign(
      decryptedSecret,
      timestamp,
      payloadString,
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SavSpot-Signature': `t=${timestamp},v1=${signature}`,
      'X-SavSpot-Delivery-Id': deliveryId,
      'X-SavSpot-Timestamp': timestamp,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        delivery.endpoint.timeoutSeconds * 1000,
      );

      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        await this.prisma.$transaction([
          this.prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              status: 'SUCCEEDED',
              attemptCount: { increment: 1 },
              responseStatus: response.status,
              responseBody: responseBody.slice(0, 2000),
              requestHeaders: headers as Prisma.InputJsonValue,
              completedAt: new Date(),
            },
          }),
          this.prisma.webhookEndpoint.update({
            where: { id: delivery.endpoint.id },
            data: { failureCount: 0 },
          }),
        ]);

        this.logger.log(
          `Webhook delivery ${deliveryId} succeeded (${response.status})`,
        );
      } else {
        await this.handleFailure(
          deliveryId,
          delivery.endpoint.id,
          delivery.attemptCount + 1,
          delivery.endpoint.maxAttempts,
          `HTTP ${response.status}: ${responseBody.slice(0, 500)}`,
          response.status,
          responseBody.slice(0, 2000),
          headers,
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';

      await this.handleFailure(
        deliveryId,
        delivery.endpoint.id,
        delivery.attemptCount + 1,
        delivery.endpoint.maxAttempts,
        errorMessage,
        null,
        null,
        headers,
      );
    }
  }

  private async handleFailure(
    deliveryId: string,
    endpointId: string,
    attemptNumber: number,
    maxAttempts: number,
    errorMessage: string,
    responseStatus: number | null,
    responseBody: string | null,
    requestHeaders: Record<string, string>,
  ): Promise<void> {
    const isFinalAttempt = attemptNumber >= maxAttempts;

    const retryDelayIndex = Math.min(
      attemptNumber - 1,
      RETRY_DELAYS_MS.length - 1,
    );
    const nextRetryAt = isFinalAttempt
      ? null
      : new Date(Date.now() + RETRY_DELAYS_MS[retryDelayIndex]!);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isFinalAttempt ? 'FAILED' : 'RETRYING',
        attemptCount: attemptNumber,
        nextRetryAt,
        responseStatus: responseStatus,
        responseBody: responseBody,
        requestHeaders: requestHeaders as Prisma.InputJsonValue,
        completedAt: isFinalAttempt ? new Date() : null,
      },
    });

    // Update endpoint failure tracking
    const endpoint = await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        failureCount: { increment: 1 },
        lastFailureAt: new Date(),
      },
    });

    this.logger.warn(
      `Webhook delivery ${deliveryId} failed (attempt ${attemptNumber}/${maxAttempts}): ${errorMessage}`,
    );

    // Circuit breaker: disable endpoint after consecutive failures
    if (endpoint.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          isActive: false,
          disabledReason: `Automatically disabled after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures`,
        },
      });

      this.logger.warn(
        `Webhook endpoint ${endpointId} disabled after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures`,
      );
    }
  }

  private sign(
    secret: string,
    timestamp: string,
    payload: string,
  ): string {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }
}
