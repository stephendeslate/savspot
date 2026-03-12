import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '../../../../prisma/generated/prisma/runtime/library';
import { PartnerStatus, PayoutStatus } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const PAYOUT_THRESHOLD = new Decimal(50);

@Injectable()
export class PartnerPayoutService {
  private readonly logger = new Logger(PartnerPayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processPayoutBatch() {
    const eligiblePartners = await this.prisma.partner.findMany({
      where: {
        status: PartnerStatus.APPROVED,
        totalEarnings: { gte: PAYOUT_THRESHOLD },
      },
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const results: { partnerId: string; amount: Decimal }[] = [];

    for (const partner of eligiblePartners) {
      const lastPayout = await this.prisma.partnerPayout.findFirst({
        where: { partnerId: partner.id },
        orderBy: { periodEnd: 'desc' },
      });

      const sinceDate = lastPayout?.periodEnd ?? partner.createdAt;

      const earnings = partner.totalEarnings.minus(
        lastPayout
          ? (await this.prisma.partnerPayout.aggregate({
              where: {
                partnerId: partner.id,
                status: { not: PayoutStatus.FAILED },
              },
              _sum: { amount: true },
            }))._sum.amount ?? new Decimal(0)
          : new Decimal(0),
      );

      if (earnings.lt(PAYOUT_THRESHOLD)) {
        continue;
      }

      const payout = await this.prisma.partnerPayout.create({
        data: {
          partnerId: partner.id,
          amount: earnings,
          currency: 'USD',
          status: PayoutStatus.PENDING,
          periodStart: sinceDate,
          periodEnd: periodStart,
        },
      });

      this.logger.log(
        `[STUB] Stripe transfer for partner ${partner.id}: $${earnings.toString()} — payout ${payout.id}`,
      );

      results.push({ partnerId: partner.id, amount: earnings });
    }

    this.logger.log(`Payout batch complete: ${results.length} payouts created`);

    return {
      processed: results.length,
      payouts: results,
    };
  }

  async getPayoutHistory(partnerId: string) {
    return this.prisma.partnerPayout.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
