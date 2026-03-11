import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

type NoShowRiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

function getRiskTier(score: Prisma.Decimal): NoShowRiskTier {
  const val = score.toNumber();
  if (val >= 0.6) return 'HIGH';
  if (val >= 0.3) return 'MEDIUM';
  return 'LOW';
}

@Injectable()
export class AiOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSlotDemandInsights(tenantId: string) {
    const now = new Date();
    return this.prisma.slotDemandInsight.findMany({
      where: {
        tenantId,
        isDismissed: false,
        expiresAt: { gt: now },
      },
      orderBy: { computedAt: 'desc' },
    });
  }

  async dismissInsight(tenantId: string, insightId: string, userId: string) {
    const insight = await this.prisma.slotDemandInsight.findFirst({
      where: { id: insightId, tenantId },
    });

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return this.prisma.slotDemandInsight.update({
      where: { id: insightId },
      data: { isDismissed: true, dismissedBy: userId },
    });
  }

  async getClientRisk(tenantId: string, clientId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        clientId,
        status: 'CONFIRMED',
        startTime: { gt: new Date() },
        noShowRiskScore: { not: null },
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        noShowRiskScore: true,
        service: { select: { name: true } },
      },
    });

    if (!booking || !booking.noShowRiskScore) {
      return { bookingId: null, riskScore: null, riskTier: null };
    }

    return {
      bookingId: booking.id,
      startTime: booking.startTime,
      serviceName: booking.service.name,
      riskScore: booking.noShowRiskScore,
      riskTier: getRiskTier(booking.noShowRiskScore),
    };
  }

  async getClientRebooking(tenantId: string, clientId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { tenantId_clientId: { tenantId, clientId } },
      select: { rebookingIntervalDays: true, optimalReminderLeadHours: true },
    });

    return {
      rebookingIntervalDays: profile?.rebookingIntervalDays ?? null,
      optimalReminderLeadHours: profile?.optimalReminderLeadHours ?? null,
    };
  }

  async getBenchmarks(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { category: true, benchmarkOptOut: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.benchmarkOptOut) {
      return { optedOut: true, benchmarks: [] };
    }

    const benchmarks = await this.prisma.categoryBenchmark.findMany({
      where: { businessCategory: tenant.category },
      orderBy: { metricKey: 'asc' },
    });

    return { optedOut: false, benchmarks };
  }
}
