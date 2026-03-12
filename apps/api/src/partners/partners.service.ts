import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Decimal } from '../../../../prisma/generated/prisma/runtime/library';
import { PartnerStatus, PartnerTier } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyPartnerDto) {
    const existing = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has a partner application');
    }

    const referralCode = randomBytes(4).toString('hex');

    const partner = await this.prisma.partner.create({
      data: {
        userId,
        type: dto.type,
        companyName: dto.companyName,
        companyUrl: dto.companyUrl ?? null,
        status: PartnerStatus.PENDING,
        referralCode,
      },
    });

    this.logger.log(`Partner application created: ${partner.id} by user ${userId}`);

    return partner;
  }

  async getPartnerByUserId(userId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            referredTenants: true,
            payouts: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  async getPartnerReferrals(partnerId: string) {
    return this.prisma.partnerReferral.findMany({
      where: { partnerId },
      include: {
        tenant: {
          select: { id: true, name: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerPayouts(partnerId: string) {
    return this.prisma.partnerPayout.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralLink(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { referralCode: true },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return {
      referralLink: `https://savspot.co/signup?partner=${partner.referralCode}`,
      referralCode: partner.referralCode,
    };
  }

  async listPartners(status?: string) {
    const where = status ? { status: status as PartnerStatus } : {};

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              referredTenants: true,
              payouts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return { data: partners, meta: { total } };
  }

  async updatePartnerStatus(id: string, status: string, approvedBy?: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const data: Record<string, unknown> = {
      status: status as PartnerStatus,
    };

    if (status === PartnerStatus.APPROVED) {
      data['approvedAt'] = new Date();
      if (approvedBy) {
        data['approvedBy'] = approvedBy;
      }
    }

    const updated = await this.prisma.partner.update({
      where: { id },
      data,
    });

    this.logger.log(`Partner ${id} status updated to ${status}`);

    return updated;
  }

  async updatePartner(id: string, status?: string, commissionRate?: number) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const data: Record<string, unknown> = {};

    if (status) {
      data['status'] = status as PartnerStatus;
      if (status === PartnerStatus.APPROVED) {
        data['approvedAt'] = new Date();
      }
    }

    if (commissionRate !== undefined) {
      data['commissionRate'] = new Decimal(commissionRate);
    }

    return this.prisma.partner.update({
      where: { id },
      data,
    });
  }

  async recordReferral(partnerId: string, tenantId: string) {
    const referral = await this.prisma.partnerReferral.create({
      data: {
        partnerId,
        tenantId,
      },
    });

    const partner = await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        totalReferrals: { increment: 1 },
      },
    });

    let newTier: PartnerTier | null = null;
    if (partner.totalReferrals >= 50 && partner.tier !== PartnerTier.GOLD) {
      newTier = PartnerTier.GOLD;
    } else if (partner.totalReferrals >= 10 && partner.tier === PartnerTier.STANDARD) {
      newTier = PartnerTier.SILVER;
    }

    if (newTier) {
      await this.prisma.partner.update({
        where: { id: partnerId },
        data: { tier: newTier },
      });
      this.logger.log(`Partner ${partnerId} promoted to tier ${newTier}`);
    }

    return referral;
  }
}
