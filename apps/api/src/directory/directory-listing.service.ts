import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DirectoryListingService {
  private readonly logger = new Logger(DirectoryListingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshAllListings(): Promise<void> {
    const publishedTenants = await this.prisma.tenant.findMany({
      where: { isPublished: true, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const tenant of publishedTenants) {
      await this.refreshListing(tenant.id);
    }

    this.logger.log(`Refreshed directory listings for ${publishedTenants.length} tenants`);
  }

  async refreshListing(tenantId: string): Promise<void> {
    const [bookingStats, reviewStats] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _count: true,
      }),
      this.prisma.review.aggregate({
        where: { tenantId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const lastBooking = await this.prisma.booking.findFirst({
      where: { tenantId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    await this.prisma.directoryListing.upsert({
      where: { tenantId },
      create: {
        tenantId,
        totalBookings: bookingStats._count,
        averageRating: reviewStats._avg.rating,
        reviewCount: reviewStats._count,
        lastActiveAt: lastBooking?.createdAt,
      },
      update: {
        totalBookings: bookingStats._count,
        averageRating: reviewStats._avg.rating,
        reviewCount: reviewStats._count,
        lastActiveAt: lastBooking?.createdAt,
      },
    });
  }
}
