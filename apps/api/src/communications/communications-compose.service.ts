import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/prisma';
import { ComposeMessageDto, ComposeChannel } from './dto/compose-message.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_COMMUNICATIONS, JOB_DELIVER_COMMUNICATION, JOB_DELIVER_PROVIDER_SMS } from '../bullmq/queue.constants';

@Injectable()
export class CommunicationsComposeService {
  private readonly logger = new Logger(CommunicationsComposeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  async compose(tenantId: string, dto: ComposeMessageDto) {
    let recipientEmail = dto.recipientEmail;
    let recipientPhone = dto.recipientPhone;
    let recipientId = dto.recipientId;
    let recipientName = 'Recipient';

    if (dto.recipientId) {
      const membership = await this.prisma.tenantMembership.findFirst({
        where: { userId: dto.recipientId, tenantId },
        include: { user: { select: { id: true, email: true, phone: true, name: true } } },
      });
      if (!membership) {
        throw new BadRequestException('Recipient not found in this tenant');
      }
      recipientId = membership.user.id;
      recipientEmail = membership.user.email;
      recipientPhone = membership.user.phone ?? undefined;
      recipientName = membership.user.name;
    }

    if (dto.channel === ComposeChannel.EMAIL) {
      if (!recipientEmail) {
        throw new BadRequestException('Recipient email is required for EMAIL channel');
      }
      if (!recipientId) {
        throw new BadRequestException('recipientId is required — ad-hoc email to non-users is not supported');
      }

      const communication = await this.prisma.communication.create({
        data: {
          tenantId,
          recipientId,
          channel: 'EMAIL',
          templateKey: dto.templateKey ?? null,
          subject: dto.subject ?? 'Message from your provider',
          body: dto.body,
          status: 'QUEUED',
          metadata: {
            recipientEmail,
            recipientName,
            source: 'compose',
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await this.commsQueue.add(
        JOB_DELIVER_COMMUNICATION,
        {
          communicationId: communication.id,
          tenantId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      );

      this.logger.log(`Compose email queued: id=${communication.id} to=${recipientEmail}`);
      return { id: communication.id, status: 'QUEUED', channel: 'EMAIL' };
    }

    if (dto.channel === ComposeChannel.SMS) {
      if (!recipientPhone) {
        throw new BadRequestException('Recipient phone is required for SMS channel');
      }
      if (!recipientId) {
        throw new BadRequestException('recipientId is required — ad-hoc SMS to non-users is not supported');
      }

      const communication = await this.prisma.communication.create({
        data: {
          tenantId,
          recipientId,
          channel: 'SMS',
          templateKey: dto.templateKey ?? null,
          subject: null,
          body: dto.body,
          status: 'QUEUED',
          metadata: {
            recipientPhone,
            recipientName,
            source: 'compose',
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await this.commsQueue.add(
        JOB_DELIVER_PROVIDER_SMS,
        {
          communicationId: communication.id,
          tenantId,
          to: recipientPhone,
          body: dto.body,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      );

      this.logger.log(`Compose SMS queued: id=${communication.id} to=${recipientPhone}`);
      return { id: communication.id, status: 'QUEUED', channel: 'SMS' };
    }

    throw new BadRequestException('Invalid channel');
  }
}
