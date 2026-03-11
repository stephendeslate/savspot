import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import { QUEUE_WEBHOOKS } from '../../bullmq/queue.constants';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_WEBHOOKS) private readonly webhookQueue: Queue,
  ) {}

  async list(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        description: true,
        maxAttempts: true,
        timeoutSeconds: true,
        failureCount: true,
        lastFailureAt: true,
        disabledReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(tenantId: string, dto: CreateWebhookDto) {
    const secret = this.generateSecret();

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        secret,
        events: dto.events,
        description: dto.description ?? null,
        maxAttempts: dto.maxAttempts ?? 5,
        timeoutSeconds: dto.timeoutSeconds ?? 10,
      },
    });

    this.logger.log(`Webhook endpoint ${endpoint.id} created for tenant ${tenantId}`);

    return {
      ...endpoint,
      secret,
    };
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const existing = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const data: Prisma.WebhookEndpointUpdateInput = {};
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.events !== undefined) data.events = dto.events;
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
      if (dto.isActive) {
        data.disabledReason = null;
        data.failureCount = 0;
      }
    }
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.webhookEndpoint.update({
      where: { id },
      data,
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        description: true,
        maxAttempts: true,
        timeoutSeconds: true,
        failureCount: true,
        lastFailureAt: true,
        disabledReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    await this.prisma.$transaction([
      this.prisma.webhookDelivery.deleteMany({
        where: { endpointId: id, status: 'PENDING' },
      }),
      this.prisma.webhookEndpoint.delete({ where: { id } }),
    ]);

    this.logger.log(`Webhook endpoint ${id} deleted`);
  }

  async sendTest(id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from SavSpot',
      },
    };

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        endpointId: id,
        event: 'test',
        idempotencyKey: randomUUID(),
        payload: testPayload as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    await this.webhookQueue.add('dispatchWebhook', {
      deliveryId: delivery.id,
    });

    this.logger.log(`Test webhook queued for endpoint ${id}`);

    return { deliveryId: delivery.id, status: 'queued' };
  }

  async rotateSecret(id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const newSecret = this.generateSecret();

    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        secret: newSecret,
        previousSecret: endpoint.secret,
        secretRotatedAt: new Date(),
      },
    });

    this.logger.log(`Secret rotated for webhook endpoint ${id}`);

    return { secret: newSecret };
  }

  async listDeliveries(
    endpointId: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WebhookDeliveryWhereInput = { endpointId };
    if (query.status) {
      where.status = query.status as Prisma.WebhookDeliveryWhereInput['status'];
    }

    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async dispatch(
    tenantId: string,
    event: string,
    entityId: string,
    payload: unknown,
  ) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    if (endpoints.length === 0) return;

    const deliveries = await this.prisma.$transaction(
      endpoints.map((endpoint) =>
        this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            idempotencyKey: randomUUID(),
            payload: {
              event,
              entityId,
              timestamp: new Date().toISOString(),
              data: payload,
            } as Prisma.InputJsonValue,
            status: 'PENDING',
          },
        }),
      ),
    );

    for (const delivery of deliveries) {
      await this.webhookQueue.add('dispatchWebhook', {
        deliveryId: delivery.id,
      });
    }

    this.logger.log(
      `Dispatched ${deliveries.length} webhook deliveries for event ${event} tenant ${tenantId}`,
    );
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }
}
