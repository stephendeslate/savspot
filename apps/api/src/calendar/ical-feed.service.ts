import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IcalFeedService {
  private readonly logger = new Logger(IcalFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateFeed(tenantSlug: string, token: string): Promise<string> {
    if (!token) {
      throw new UnauthorizedException('Missing ical_feed_token');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true, timezone: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const connection = await this.prisma.calendarConnection.findUnique({
      where: { icalFeedToken: token },
      select: { id: true, tenantId: true, userId: true },
    });

    if (!connection || connection.tenantId !== tenant.id) {
      throw new UnauthorizedException('Invalid feed token');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        status: 'CONFIRMED',
      },
      include: {
        service: { select: { name: true } },
        client: { select: { name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const now = this.formatDate(new Date());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//SavSpot//${tenant.name}//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeIcal(tenant.name)} Bookings`,
      `X-WR-TIMEZONE:${tenant.timezone}`,
    ];

    for (const booking of bookings) {
      const summary = `${booking.service.name} - ${booking.client.name}`;
      const description = booking.notes
        ? `Client: ${booking.client.name}\\nEmail: ${booking.client.email ?? 'N/A'}\\nNotes: ${booking.notes}`
        : `Client: ${booking.client.name}\\nEmail: ${booking.client.email ?? 'N/A'}`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${booking.id}@savspot.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${this.formatDate(booking.startTime)}`,
        `DTEND:${this.formatDate(booking.endTime)}`,
        `SUMMARY:${this.escapeIcal(summary)}`,
        `DESCRIPTION:${this.escapeIcal(description)}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    this.logger.debug(
      `Generated iCal feed for tenant ${tenantSlug} with ${bookings.length} events`,
    );

    return lines.join('\r\n');
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeIcal(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
