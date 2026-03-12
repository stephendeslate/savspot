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

    // Process in batches of 20 to avoid overwhelming the database
    const BATCH_SIZE = 20;
    for (let i = 0; i < publishedTenants.length; i += BATCH_SIZE) {
      const batch = publishedTenants.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((t) => this.refreshListing(t.id)));
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(`${failures.length} listings failed to refresh in batch`);
      }
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
