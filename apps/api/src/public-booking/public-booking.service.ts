import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List all active tenant slugs for sitemap generation.
   */
  async listActiveBookingSlugs(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    });
    return tenants.map((t) => t.slug);
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
    // Resolve tenant first (tenants table is not tenant-scoped, no RLS issue)
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Business not found');
    }

    // Set RLS context so tenant-scoped queries (services) work with FORCE RLS
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, FALSE)`;

    const fullTenant = await this.prisma.tenant.findUnique({
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
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!fullTenant) {
      throw new NotFoundException('Business not found');
    }

    return fullTenant;
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

    // Set RLS context so tenant-scoped queries (services, availability_rules, service_addons) work with FORCE RLS
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, FALSE)`;

    const service = await this.prisma.service.findFirst({
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

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Also load tenant-wide availability rules (for days without service rules)
    const tenantWideRules = await this.prisma.availabilityRule.findMany({
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

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        currency: tenant.currency,
      },
      service,
      tenantWideAvailability: tenantWideRules,
    };
  }
}
