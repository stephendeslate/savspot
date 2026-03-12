import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

interface ServiceAffinityRow {
  service_a: string;
  service_b: string;
  co_occurrence: bigint;
  tenant_id: string;
}

interface PopularServiceRow {
  user_id: string;
  tenant_id: string;
  service_id: string;
  category_id: string;
  service_name: string;
  booking_count: bigint;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUpsellRecommendations(tenantId: string) {
    const recommendations = await this.prisma.clientRecommendation.findMany({
      where: {
        tenantId,
        expiresAt: { gt: new Date() },
      },
      include: {
        service: { select: { id: true, name: true, basePrice: true, currency: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { score: 'desc' },
    });

    const grouped = new Map<string, {
      serviceId: string;
      serviceName: string;
      basePrice: Prisma.Decimal;
      currency: string;
      totalScore: number;
      count: number;
      clients: Array<{ userId: string; userName: string; score: Prisma.Decimal }>;
    }>();

    for (const rec of recommendations) {
      const existing = grouped.get(rec.serviceId);
      const client = {
        userId: rec.userId,
        userName: rec.user.name,
        score: rec.score,
      };

      if (existing) {
        existing.totalScore += rec.score.toNumber();
        existing.count += 1;
        existing.clients.push(client);
      } else {
        grouped.set(rec.serviceId, {
          serviceId: rec.serviceId,
          serviceName: rec.service.name,
          basePrice: rec.service.basePrice,
          currency: rec.service.currency,
          totalScore: rec.score.toNumber(),
          count: 1,
          clients: [client],
        });
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  async getClientRecommendations(userId: string, tenantId: string) {
    return this.prisma.clientRecommendation.findMany({
      where: {
        userId,
        tenantId,
        expiresAt: { gt: new Date() },
      },
      include: {
        service: { select: { id: true, name: true, basePrice: true, currency: true } },
      },
      orderBy: { score: 'desc' },
    });
  }

  async trackClick(recommendationId: string) {
    const rec = await this.prisma.clientRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!rec) {
      throw new NotFoundException('Recommendation not found');
    }

    return this.prisma.clientRecommendation.update({
      where: { id: recommendationId },
      data: {
        clicked: true,
        impressions: { increment: 1 },
      },
    });
  }

  async computeServiceAffinity(tenantId?: string): Promise<void> {
    this.logger.log('Computing service affinity...');

    const tenantFilter = tenantId ? Prisma.sql`AND b1.tenant_id = ${tenantId}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ServiceAffinityRow[]>`
      SELECT
        b1.service_id AS service_a,
        b2.service_id AS service_b,
        COUNT(*) AS co_occurrence,
        b1.tenant_id
      FROM bookings b1
      JOIN bookings b2
        ON b1.client_id = b2.client_id
        AND b1.tenant_id = b2.tenant_id
        AND b1.service_id < b2.service_id
      WHERE b1.status IN ('CONFIRMED', 'COMPLETED')
        AND b2.status IN ('CONFIRMED', 'COMPLETED')
        ${tenantFilter}
      GROUP BY b1.service_id, b2.service_id, b1.tenant_id
      HAVING COUNT(*) >= 3
      ORDER BY co_occurrence DESC
    `;

    for (const row of rows) {
      await this.prisma.recommendationModel.create({
        data: {
          type: 'SERVICE_AFFINITY',
          modelData: {
            serviceA: row.service_a,
            serviceB: row.service_b,
            coOccurrence: Number(row.co_occurrence),
            tenantId: row.tenant_id,
          },
          trainingSize: Number(row.co_occurrence),
          trainedAt: new Date(),
        },
      });
    }

    this.logger.log(`Computed ${rows.length} service affinity pairs`);
  }

  async computeClientPreferences(tenantId?: string): Promise<void> {
    this.logger.log('Computing client preferences...');

    const tenantFilter = tenantId ? Prisma.sql`AND b.tenant_id = ${tenantId}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<PopularServiceRow[]>`
      WITH client_categories AS (
        SELECT DISTINCT
          b.client_id AS user_id,
          b.tenant_id,
          s.category_id
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.status IN ('CONFIRMED', 'COMPLETED')
          AND s.category_id IS NOT NULL
          ${tenantFilter}
      ),
      popular_in_category AS (
        SELECT
          s.id AS service_id,
          s.category_id,
          s.tenant_id,
          s.name AS service_name,
          COUNT(b.id) AS booking_count
        FROM services s
        JOIN bookings b ON s.id = b.service_id
        WHERE b.status IN ('CONFIRMED', 'COMPLETED')
          AND s.is_active = true
          AND s.category_id IS NOT NULL
        GROUP BY s.id, s.category_id, s.tenant_id, s.name
        HAVING COUNT(b.id) >= 5
      ),
      client_booked AS (
        SELECT DISTINCT client_id AS user_id, service_id, tenant_id
        FROM bookings
        WHERE status IN ('CONFIRMED', 'COMPLETED')
      )
      SELECT
        cc.user_id,
        cc.tenant_id,
        pic.service_id,
        pic.category_id,
        pic.service_name,
        pic.booking_count
      FROM client_categories cc
      JOIN popular_in_category pic
        ON cc.category_id = pic.category_id
        AND cc.tenant_id = pic.tenant_id
      LEFT JOIN client_booked cb
        ON cb.user_id = cc.user_id
        AND cb.service_id = pic.service_id
        AND cb.tenant_id = cc.tenant_id
      WHERE cb.user_id IS NULL
      ORDER BY pic.booking_count DESC
    `;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    let created = 0;
    for (const row of rows) {
      const maxBookings = rows.length > 0
        ? Math.max(...rows.map(r => Number(r.booking_count)))
        : 1;
      const score = Number(row.booking_count) / maxBookings;

      await this.prisma.clientRecommendation.create({
        data: {
          userId: row.user_id,
          tenantId: row.tenant_id,
          serviceId: row.service_id,
          score,
          reason: `Popular in your frequently booked category: ${row.service_name}`,
          expiresAt,
        },
      });
      created++;
    }

    this.logger.log(`Created ${created} client preference recommendations`);
  }

  async cleanupExpired(): Promise<void> {
    const result = await this.prisma.clientRecommendation.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    this.logger.log(`Cleaned up ${result.count} expired recommendations`);
  }
}
