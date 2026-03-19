import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFromSession(
    sessionId: string,
    preferredDate?: string,
    preferredTimeStart?: string,
    preferredTimeEnd?: string,
  ) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: { service: true },
    });

    if (!session) {
      throw new NotFoundException('Booking session not found');
    }

    if (!session.serviceId) {
      throw new BadRequestException('Session has no service selected');
    }

    const serviceId = session.serviceId;
    const data = (session.data ?? {}) as Record<string, unknown>;
    const clientEmail = data['guestEmail'] as string | undefined;
    const clientName = data['guestName'] as string | undefined;
    const staffId = (data['staffId'] as string | undefined) ?? undefined;

    if (!clientEmail || !clientName) {
      throw new BadRequestException(
        'Client info (email, name) must be provided in the session before joining the waitlist',
      );
    }

    // Idempotent: return existing active entry for same client + service
    const existing = await this.prisma.waitlistEntry.findFirst({
      where: {
        tenantId: session.tenantId,
        serviceId,
        clientEmail,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return existing;
    }

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        tenantId: session.tenantId,
        serviceId,
        staffId: staffId ?? null,
        clientEmail,
        clientName,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeStart: preferredTimeStart ?? null,
        preferredTimeEnd: preferredTimeEnd ?? null,
      },
    });

    this.logger.log(
      `Waitlist entry created: ${entry.id} for ${clientEmail} on service ${serviceId}`,
    );

    return entry;
  }

  async listByTenant(tenantId: string) {
    return this.prisma.waitlistEntry.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: {
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    });
  }

  async remove(tenantId: string, entryId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id: entryId, tenantId },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    await this.prisma.waitlistEntry.delete({
      where: { id: entryId },
    });

    return { deleted: true };
  }

  async findMatchingEntries(
    tenantId: string,
    serviceId: string,
    date?: Date,
  ) {
    return this.prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        serviceId,
        status: 'ACTIVE',
        ...(date ? { preferredDate: date } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
  }

  async markNotified(entryId: string) {
    return this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: {
        status: 'NOTIFIED',
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h to book
      },
    });
  }
}
