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
    return this.prisma.$transaction(async (tx) => {
      const eligiblePartners = await tx.partner.findMany({
        where: {
          status: PartnerStatus.APPROVED,
          totalEarnings: { gte: PAYOUT_THRESHOLD },
        },
      });

      if (eligiblePartners.length === 0) {
        return { processed: 0, payouts: [] };
      }

      const partnerIds = eligiblePartners.map((p) => p.id);
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Batch fetch: last payout per partner + total paid out
      const [lastPayouts, paidSums] = await Promise.all([
        tx.partnerPayout.findMany({
          where: { partnerId: { in: partnerIds } },
          orderBy: { periodEnd: 'desc' },
          distinct: ['partnerId'],
          select: { partnerId: true, periodEnd: true },
        }),
        tx.partnerPayout.groupBy({
          by: ['partnerId'],
          where: {
            partnerId: { in: partnerIds },
            status: { not: PayoutStatus.FAILED },
          },
          _sum: { amount: true },
        }),
      ]);

      const lastPayoutMap = new Map(lastPayouts.map((p) => [p.partnerId, p.periodEnd]));
      const paidSumMap = new Map(paidSums.map((p) => [p.partnerId, p._sum.amount ?? new Decimal(0)]));

      const payoutData: Array<{
        partnerId: string;
        amount: Decimal;
        currency: string;
        status: PayoutStatus;
        periodStart: Date;
        periodEnd: Date;
      }> = [];

      for (const partner of eligiblePartners) {
        const totalPaid = paidSumMap.get(partner.id) ?? new Decimal(0);
        const earnings = partner.totalEarnings.minus(totalPaid);

        if (earnings.lt(PAYOUT_THRESHOLD)) {
          continue;
        }

        const sinceDate = lastPayoutMap.get(partner.id) ?? partner.createdAt;

        payoutData.push({
          partnerId: partner.id,
          amount: earnings,
          currency: 'USD',
          status: PayoutStatus.PENDING,
          periodStart: sinceDate,
          periodEnd: periodStart,
        });
      }

      if (payoutData.length > 0) {
        await tx.partnerPayout.createMany({ data: payoutData });
      }

      for (const payout of payoutData) {
        this.logger.log(
          `[STUB] Stripe transfer for partner ${payout.partnerId}: $${payout.amount.toString()}`,
        );
      }

      this.logger.log(`Payout batch complete: ${payoutData.length} payouts created`);

      return {
        processed: payoutData.length,
        payouts: payoutData.map((p) => ({ partnerId: p.partnerId, amount: p.amount })),
      };
    });
  }

  async getPayoutHistory(partnerId: string) {
    return this.prisma.partnerPayout.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
