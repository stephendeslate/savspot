import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { UpdateReferralLinkDto } from './dto/update-referral-link.dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listLinks(
    tenantId: string,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      this.prisma.referralLink.findMany({
        where: { tenantId },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referralLink.count({ where: { tenantId } }),
    ]);

    return {
      data: links,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createLink(
    tenantId: string,
    dto: CreateReferralLinkDto,
    createdBy: string,
  ) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.referralLink.count({
      where: {
        tenantId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentCount >= 10) {
      throw new BadRequestException(
        'Maximum of 10 referral links can be created per tenant per day',
      );
    }

    const code =
      dto.code ?? randomBytes(4).toString('hex').toUpperCase();

    const link = await this.prisma.referralLink.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        createdBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(
      `Referral link ${link.id} created by ${createdBy} for tenant ${tenantId}`,
    );

    return link;
  }

  async updateLink(id: string, dto: UpdateReferralLinkDto) {
    const existing = await this.prisma.referralLink.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Referral link not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.expiresAt !== undefined) data['expiresAt'] = new Date(dto.expiresAt);

    return this.prisma.referralLink.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteLink(id: string) {
    const existing = await this.prisma.referralLink.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Referral link not found');
    }

    return this.prisma.referralLink.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getLinkAnalytics(id: string) {
    const link = await this.prisma.referralLink.findUnique({
      where: { id },
    });

    if (!link) {
      throw new NotFoundException('Referral link not found');
    }

    return {
      id: link.id,
      code: link.code,
      name: link.name,
      usageCount: link.usageCount,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }

  async validateAndResolveReferralCode(
    tenantId: string,
    code: string,
  ): Promise<string | null> {
    const link = await this.prisma.referralLink.findUnique({
      where: {
        tenantId_code: { tenantId, code },
      },
    });

    if (!link) return null;
    if (!link.isActive) return null;
    if (link.expiresAt && link.expiresAt < new Date()) return null;

    return link.id;
  }

  async incrementUsageCount(linkId: string): Promise<void> {
    await this.prisma.referralLink.update({
      where: { id: linkId },
      data: { usageCount: { increment: 1 } },
    });
  }
}
