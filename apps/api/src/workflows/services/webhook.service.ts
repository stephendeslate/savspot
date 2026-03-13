import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  randomBytes,
  randomUUID,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import { QUEUE_WEBHOOKS } from '../../bullmq/queue.constants';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_WEBHOOKS) private readonly webhookQueue: Queue,
  ) {
    const keyHex = this.configService.get<string>('WEBHOOK_ENCRYPTION_KEY');
    if (keyHex) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      this.logger.warn(
        'WEBHOOK_ENCRYPTION_KEY not set — generating ephemeral key (development only)',
      );
      this.encryptionKey = randomBytes(32);
    }
  }

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
    const encryptedSecret = this.encryptSecret(secret);

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        secret: encryptedSecret,
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
    const encryptedNewSecret = this.encryptSecret(newSecret);

    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        secret: encryptedNewSecret,
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

    if (deliveries.length > 0) {
      await this.webhookQueue.addBulk(
        deliveries.map((delivery) => ({
          name: 'dispatchWebhook',
          data: { deliveryId: delivery.id },
        })),
      );
    }

    this.logger.log(
      `Dispatched ${deliveries.length} webhook deliveries for event ${event} tenant ${tenantId}`,
    );
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptSecret(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }
    const [ivHex, authTagHex, dataHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }
}
