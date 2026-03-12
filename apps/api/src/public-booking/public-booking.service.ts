import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * List all active tenant slugs for sitemap generation.
   */
  async listActiveBookingSlugs(): Promise<string[]> {
    const cacheKey = 'public:tenant:slugs';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as string[];
    } catch {
      /* fall through to DB */
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    });
    const slugs = tenants.map((t) => t.slug);

    await this.redis.setex(cacheKey, 3600, JSON.stringify(slugs)).catch(() => {});
    return slugs;
  }

  /**
   * Generate a QR code PNG for a booking page URL.
   */
  async generateQrCode(slug: string): Promise<Buffer> {
    // Verify slug exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    const QRCode = await import('qrcode');
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const bookingUrl = `${webUrl}/book/${slug}`;
    return QRCode.toBuffer(bookingUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }

  /**
   * Get a tenant's public profile and active services by slug.
   * Used for the public booking widget.
   */
  async getTenantBySlug(slug: string) {
    const cacheKey = `public:tenant:${slug}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* fall through to DB */
    }

    // Resolve tenant first (tenants table is not tenant-scoped, no RLS issue)
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    // Use $transaction to ensure RLS context and query share the same connection
    const fullTenant = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      return tx.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          coverPhotoUrl: true,
          brandColor: true,
          timezone: true,
          currency: true,
          country: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          category: true,
          categoryLabel: true,
          services: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              durationMinutes: true,
              basePrice: true,
              currency: true,
              pricingModel: true,
              images: true,
              guestConfig: true,
              intakeFormConfig: true,
              categoryId: true,
              category: {
                select: { id: true, name: true },
              },
              serviceAddons: {
                where: { isActive: true },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    if (!fullTenant) {
      throw new NotFoundException('Business not found');
    }

    await this.redis.setex(cacheKey, 3600, JSON.stringify(fullTenant)).catch(() => {});
    return fullTenant;
  }

  /**
   * Get services grouped by category for a tenant.
   * Returns an array of category groups, each with its services.
   */
  async getServicesGroupedByCategory(slug: string) {
    const cacheKey = `public:services:grouped:${slug}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* fall through to DB */
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    const services = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      return tx.service.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          basePrice: true,
          currency: true,
          pricingModel: true,
          images: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
          serviceAddons: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });
    });

    // Group services by category
    const grouped = new Map<
      string,
      { id: string | null; name: string; services: typeof services }
    >();

    for (const service of services) {
      const categoryKey = service.category?.id ?? '__uncategorized__';
      const categoryName = service.category?.name ?? 'Uncategorized';

      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, {
          id: service.category?.id ?? null,
          name: categoryName,
          services: [],
        });
      }
      grouped.get(categoryKey)!.services.push(service);
    }

    const result = Array.from(grouped.values());
    await this.redis.setex(cacheKey, 1800, JSON.stringify(result)).catch(() => {});
    return result;
  }

  /**
   * Get a specific service detail with availability rules for a tenant.
   * Used to display the booking flow for a selected service.
   */
  async getServiceDetail(slug: string, serviceId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        status: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    // Use $transaction to ensure RLS context and queries share the same connection
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, TRUE)`;

      const svc = await tx.service.findFirst({
        where: {
          id: serviceId,
          tenantId: tenant.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          basePrice: true,
          currency: true,
          pricingModel: true,
          images: true,
          guestConfig: true,
          depositConfig: true,
          intakeFormConfig: true,
          bufferBeforeMinutes: true,
          bufferAfterMinutes: true,
          cancellationPolicy: true,
          confirmationMode: true,
          venue: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true },
          },
          availabilityRules: {
            where: { isActive: true },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          serviceAddons: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      // Also load tenant-wide availability rules (for days without service rules)
      const tenantWideRules = await tx.availabilityRule.findMany({
        where: {
          tenantId: tenant.id,
          serviceId: null,
          isActive: true,
        },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      return { svc, tenantWideRules };
    });

    if (!result.svc) {
      throw new NotFoundException('Service not found');
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        currency: tenant.currency,
      },
      service: result.svc,
      tenantWideAvailability: result.tenantWideRules,
    };
  }
}
