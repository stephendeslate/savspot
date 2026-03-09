import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentPurpose } from '../../../../prisma/generated/prisma';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertConsent(
    userId: string,
    purpose: string,
    consented: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const now = new Date();
    const record = await this.prisma.consentRecord.upsert({
      where: {
        userId_purpose: { userId, purpose: purpose as ConsentPurpose },
      },
      create: {
        userId,
        purpose: purpose as ConsentPurpose,
        consented,
        consentedAt: now,
        withdrawnAt: consented ? null : now,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        consentTextVersion: '1.0',
      },
      update: {
        consented,
        ...(consented
          ? { consentedAt: now, withdrawnAt: null }
          : { withdrawnAt: now }),
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    this.logger.log(
      `Consent ${consented ? 'granted' : 'withdrawn'} for user ${userId}, purpose: ${purpose}`,
    );

    return record;
  }

  async createBookingConsent(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.upsertConsent(
      userId,
      'DATA_PROCESSING',
      true,
      ipAddress,
      userAgent,
    );
  }
}
