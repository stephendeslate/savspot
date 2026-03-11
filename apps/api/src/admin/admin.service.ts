import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { clampPageSize } from '../common/utils/pagination';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { ListFeedbackDto, BulkUpdateFeedbackStatusDto } from './dto/list-feedback.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';

type TenantStatusType = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
type FeedbackStatusType = 'NEW' | 'ACKNOWLEDGED' | 'PLANNED' | 'SHIPPED' | 'DECLINED';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTenants(filters: ListTenantsDto) {
    const {
      search,
      status,
      page = 1,
      limit: rawLimit = 20,
    } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};

    if (status) {
      where.status = status as TenantStatusType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          status: true,
          subscriptionTier: true,
          currency: true,
          country: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTenantStatus(tenantId: string, status: TenantStatusType) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });

    this.logger.log(
      `Tenant ${tenantId} status changed from ${tenant.status} to ${status}`,
    );

    return updated;
  }

  async getPlatformMetrics() {
    const [tenantCounts, bookingMetrics, revenueMetrics] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ status: string; count: bigint }>
      >`
        SELECT status, COUNT(*)::bigint AS count
        FROM tenants
        GROUP BY status
      `,
      this.prisma.$queryRaw<
        Array<{ total_bookings: bigint; completed_bookings: bigint }>
      >`
        SELECT
          COUNT(*)::bigint AS total_bookings,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint AS completed_bookings
        FROM bookings
      `,
      this.prisma.$queryRaw<
        Array<{ total_revenue: Prisma.Decimal | null }>
      >`
        SELECT COALESCE(SUM(amount), 0) AS total_revenue
        FROM payments
        WHERE status = 'SUCCEEDED'
      `,
    ]);

    const tenantsByStatus: Record<string, number> = {};
    let totalTenants = 0;
    for (const row of tenantCounts) {
      const count = Number(row.count);
      tenantsByStatus[row.status] = count;
      totalTenants += count;
    }

    return {
      tenants: {
        total: totalTenants,
        byStatus: tenantsByStatus,
      },
      bookings: {
        total: bookingMetrics[0] ? Number(bookingMetrics[0].total_bookings) : 0,
        completed: bookingMetrics[0] ? Number(bookingMetrics[0].completed_bookings) : 0,
      },
      revenue: {
        total: revenueMetrics[0]?.total_revenue
          ? Number(revenueMetrics[0].total_revenue)
          : 0,
      },
    };
  }

  async getSubscriptionOverview() {
    const [tierDistribution, mrrResult, churnResult] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ subscription_tier: string; count: bigint }>
      >`
        SELECT subscription_tier, COUNT(*)::bigint AS count
        FROM tenants
        WHERE status = 'ACTIVE'
        GROUP BY subscription_tier
      `,
      this.prisma.$queryRaw<
        Array<{ mrr: Prisma.Decimal | null }>
      >`
        SELECT COALESCE(SUM(
          CASE subscription_tier
            WHEN 'PREMIUM' THEN 49
            WHEN 'ENTERPRISE' THEN 199
            ELSE 0
          END
        ), 0) AS mrr
        FROM tenants
        WHERE status = 'ACTIVE'
      `,
      this.prisma.$queryRaw<
        Array<{ churned: bigint }>
      >`
        SELECT COUNT(*)::bigint AS churned
        FROM tenants
        WHERE status = 'DEACTIVATED'
          AND updated_at >= NOW() - INTERVAL '30 days'
      `,
    ]);

    const distribution: Record<string, number> = {};
    for (const row of tierDistribution) {
      distribution[row.subscription_tier] = Number(row.count);
    }

    return {
      tierDistribution: distribution,
      mrr: mrrResult[0]?.mrr ? Number(mrrResult[0].mrr) : 0,
      recentChurn: churnResult[0] ? Number(churnResult[0].churned) : 0,
    };
  }

  async listFeedback(filters: ListFeedbackDto) {
    const {
      type,
      status,
      tenantId,
      page = 1,
      limit: rawLimit = 20,
    } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = {};

    if (type) {
      where.type = type as Prisma.FeedbackWhereInput['type'];
    }
    if (status) {
      where.status = status as FeedbackStatusType;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [feedback, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data: feedback,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async bulkUpdateFeedbackStatus(dto: BulkUpdateFeedbackStatusDto) {
    const result = await this.prisma.feedback.updateMany({
      where: { id: { in: dto.ids } },
      data: { status: dto.status as FeedbackStatusType },
    });

    this.logger.log(
      `Bulk updated ${result.count} feedback items to status ${dto.status}`,
    );

    return { updated: result.count };
  }

  async listSupportTickets(filters: ListSupportTicketsDto) {
    const {
      status,
      category,
      tenantId,
      page = 1,
      limit: rawLimit = 20,
    } = filters;
    const limit = clampPageSize(rawLimit);
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {};

    if (status) {
      where.status = status as Prisma.SupportTicketWhereInput['status'];
    }
    if (category) {
      where.category = category as Prisma.SupportTicketWhereInput['category'];
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSupportMetrics() {
    const [resolutionMetrics, escalationMetrics] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          total_tickets: bigint;
          ai_resolved: bigint;
        }>
      >`
        SELECT
          COUNT(*)::bigint AS total_tickets,
          COUNT(CASE WHEN resolved_by = 'AI' THEN 1 END)::bigint AS ai_resolved
        FROM support_tickets
      `,
      this.prisma.$queryRaw<
        Array<{ escalation_count: bigint }>
      >`
        SELECT COUNT(*)::bigint AS escalation_count
        FROM support_tickets
        WHERE status = 'NEEDS_MANUAL_REVIEW'
      `,
    ]);

    const totalTickets = resolutionMetrics[0]
      ? Number(resolutionMetrics[0].total_tickets)
      : 0;
    const aiResolved = resolutionMetrics[0]
      ? Number(resolutionMetrics[0].ai_resolved)
      : 0;

    return {
      totalTickets,
      aiResolved,
      aiResolutionRate: totalTickets > 0 ? aiResolved / totalTickets : 0,
      escalationCount: escalationMetrics[0]
        ? Number(escalationMetrics[0].escalation_count)
        : 0,
    };
  }
}
