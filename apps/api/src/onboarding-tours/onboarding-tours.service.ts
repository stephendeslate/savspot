import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingToursService {
  private readonly logger = new Logger(OnboardingToursService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.onboardingTour.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTour(
    userId: string,
    tourKey: string,
    action: 'complete' | 'dismiss',
  ) {
    const now = new Date();
    const data =
      action === 'complete'
        ? { completedAt: now }
        : { dismissedAt: now };

    const tour = await this.prisma.onboardingTour.upsert({
      where: {
        userId_tourKey: { userId, tourKey },
      },
      create: {
        userId,
        tourKey,
        ...data,
      },
      update: data,
    });

    this.logger.log(`Tour "${tourKey}" ${action}d for user ${userId}`);

    return tour;
  }
}
