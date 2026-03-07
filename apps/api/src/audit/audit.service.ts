import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, ActorType } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogParams {
  tenantId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId?: string;
  actorType: ActorType;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an audit log entry. Fire-and-forget — does not throw on failure.
   */
  log(params: AuditLogParams): void {
    this.prisma.auditLog
      .create({
        data: {
          tenantId: params.tenantId ?? null,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          actorId: params.actorId ?? null,
          actorType: params.actorType,
          oldValues: params.oldValues ? (params.oldValues as object) : undefined,
          newValues: params.newValues ? (params.newValues as object) : undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: params.metadata ? (params.metadata as object) : undefined,
        },
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to write audit log: ${err.message}`);
      });
  }

  /**
   * Query audit logs with optional filters and pagination.
   */
  async query(filters: {
    tenantId?: string;
    entityType?: string;
    actorId?: string;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.tenantId) where['tenantId'] = filters.tenantId;
    if (filters.entityType) where['entityType'] = filters.entityType;
    if (filters.actorId) where['actorId'] = filters.actorId;
    if (filters.action) where['action'] = filters.action;
    if (filters.from || filters.to) {
      where['timestamp'] = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
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
}
