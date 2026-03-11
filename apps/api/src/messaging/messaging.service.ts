import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listThreads(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      messages: { some: { senderId: userId } },
    };

    const [threads, total] = await Promise.all([
      this.prisma.messageThread.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageThread.count({ where }),
    ]);

    return {
      data: threads.map((thread) => ({
        id: thread.id,
        tenantId: thread.tenantId,
        subject: thread.subject,
        priority: thread.priority,
        status: thread.status,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        lastMessage: thread.messages[0] ?? null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createThread(
    tenantId: string,
    creatorId: string,
    dto: { participantIds: string[]; subject?: string; body: string },
  ) {
    const thread = await this.prisma.messageThread.create({
      data: {
        tenantId,
        subject: dto.subject ?? null,
        messages: {
          create: {
            senderId: creatorId,
            body: dto.body,
          },
        },
      },
      include: {
        messages: {
          select: {
            id: true,
            senderId: true,
            body: true,
            createdAt: true,
          },
        },
      },
    });

    this.logger.log(
      `Thread created: id=${thread.id} creator=${creatorId} tenant=${tenantId}`,
    );

    return thread;
  }

  async getThread(tenantId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
            readStatuses: {
              select: { userId: true, readAt: true },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Message thread not found');
    }

    return thread;
  }

  async sendMessage(
    tenantId: string,
    threadId: string,
    senderId: string,
    dto: { body: string },
  ) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, tenantId },
    });

    if (!thread) {
      throw new NotFoundException('Message thread not found');
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId,
        body: dto.body,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(
      `Message sent: id=${message.id} thread=${threadId} sender=${senderId}`,
    );

    return message;
  }

  async markThreadRead(tenantId: string, threadId: string, userId: string) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, tenantId },
      include: {
        messages: {
          where: {
            readStatuses: { none: { userId } },
            NOT: { senderId: userId },
          },
          select: { id: true },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Message thread not found');
    }

    if (thread.messages.length === 0) {
      return { markedRead: 0 };
    }

    const now = new Date();
    await this.prisma.messageReadStatus.createMany({
      data: thread.messages.map((msg) => ({
        messageId: msg.id,
        userId,
        readAt: now,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Marked ${thread.messages.length} message(s) as read in thread ${threadId} for user ${userId}`,
    );

    return { markedRead: thread.messages.length };
  }
}
