import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/prisma';

interface LogQueryOptions {
  page: number;
  limit: number;
  channel?: 'EMAIL' | 'SMS';
  status?: string;
  clientId?: string;
}

@Injectable()
export class CommunicationsLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getLog(tenantId: string, options: LogQueryOptions) {
    const { page, limit, channel, status, clientId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunicationWhereInput = {
      tenantId,
      ...(channel && { channel }),
      ...(status && { status: status as Prisma.CommunicationWhereInput['status'] }),
      ...(clientId && { recipientId: clientId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.communication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          channel: true,
          templateKey: true,
          subject: true,
          status: true,
          providerMessageId: true,
          sentAt: true,
          deliveredAt: true,
          openedAt: true,
          failureReason: true,
          metadata: true,
          createdAt: true,
          recipient: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.communication.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
