import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Parameters for creating a notification.
 * The category and priority are used to resolve a NotificationType record
 * (upserted by key if it does not exist).
 */
export interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  category: 'SYSTEM' | 'BOOKING' | 'PAYMENT' | 'CONTRACT' | 'COMMUNICATION' | 'MARKETING' | 'REVIEW' | 'CALENDAR';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsOptions {
  page?: number;
  limit?: number;
  unread?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a notification for a user within a tenant.
   * Resolves the NotificationType by a generated key based on category,
   * upserting it if necessary.
   */
  async create(params: CreateNotificationParams) {
    const {
      tenantId,
      userId,
      title,
      body,
      category,
      priority = 'NORMAL',
      metadata,
    } = params;

    // Resolve or create NotificationType by key
    const typeKey = `${category.toLowerCase()}.general`;
    const notificationType = await this.prisma.notificationType.upsert({
      where: { key: typeKey },
      update: {},
      create: {
        key: typeKey,
        name: `${category} Notification`,
        category,
        priority,
        defaultChannels: ['IN_APP'],
        isSystem: true,
      },
    });

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        typeId: notificationType.id,
        title,
        body,
        data: metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
      include: {
        notificationType: {
          select: {
            key: true,
            category: true,
            priority: true,
          },
        },
      },
    });

    this.logger.log(
      `Notification created for user ${userId}: ${title}`,
    );

    return notification;
  }

  /**
   * Returns a paginated list of notifications for a user within a tenant.
   * Optionally filters to unread-only.
   */
  async findAll(
    tenantId: string,
    userId: string,
    options: ListNotificationsOptions = {},
  ) {
    const { page = 1, limit = 20, unread } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId,
    };

    if (unread === true) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          notificationType: {
            select: {
              key: true,
              category: true,
              priority: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns the count of unread notifications for a user within a tenant.
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marks a single notification as read.
   */
  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all unread notifications as read for a user within a tenant.
   */
  async markAllRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(
      `Marked ${result.count} notification(s) as read for user ${userId}`,
    );

    return { count: result.count };
  }
}
