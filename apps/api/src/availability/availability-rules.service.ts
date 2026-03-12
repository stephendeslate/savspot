import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class AvailabilityRulesService {
  private readonly logger = new Logger(AvailabilityRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Convert an "HH:mm" string to a Date object (1970-01-01).
   * Prisma @db.Time() fields are mapped to Date objects.
   */
  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(1970, 0, 1, hours, minutes, 0, 0);
  }

  /**
   * Convert a Date object (from Prisma @db.Time()) back to "HH:mm" string.
   */
  private formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Transform a rule's startTime/endTime from Date to "HH:mm" string.
   */
  private serializeRule<T extends { startTime: Date; endTime: Date }>(
    rule: T,
  ): Omit<T, 'startTime' | 'endTime'> & { startTime: string; endTime: string } {
    return {
      ...rule,
      startTime: this.formatTime(rule.startTime),
      endTime: this.formatTime(rule.endTime),
    };
  }

  /**
   * List all availability rules for a tenant, optionally filtered by service and venue.
   */
  async findAll(tenantId: string, serviceId?: string, venueId?: string) {
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        tenantId,
        ...(serviceId ? { serviceId } : {}),
        ...(venueId ? { venueId } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rules.map((rule) => this.serializeRule(rule));
  }

  /**
   * Create a new availability rule.
   */
  async create(tenantId: string, dto: CreateRuleDto) {
    const rule = await this.prisma.availabilityRule.create({
      data: {
        tenantId,
        dayOfWeek: dto.dayOfWeek,
        startTime: this.parseTime(dto.startTime),
        endTime: this.parseTime(dto.endTime),
        serviceId: dto.serviceId ?? null,
        venueId: dto.venueId ?? null,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.invalidateRulesCache(tenantId);
    return this.serializeRule(rule);
  }

  /**
   * Update an existing availability rule.
   */
  async update(tenantId: string, id: string, dto: UpdateRuleDto) {
    const existing = await this.prisma.availabilityRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Availability rule not found');
    }

    const rule = await this.prisma.availabilityRule.update({
      where: { id },
      data: {
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.startTime !== undefined ? { startTime: this.parseTime(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: this.parseTime(dto.endTime) } : {}),
        ...(dto.serviceId !== undefined ? { serviceId: dto.serviceId } : {}),
        ...(dto.venueId !== undefined ? { venueId: dto.venueId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.invalidateRulesCache(tenantId);
    return this.serializeRule(rule);
  }

  /**
   * Delete an availability rule.
   */
  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.availabilityRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Availability rule not found');
    }

    await this.prisma.availabilityRule.delete({
      where: { id },
    });
    await this.invalidateRulesCache(tenantId);

    return { message: 'Availability rule deleted successfully' };
  }

  /**
   * Invalidate all availability rule cache keys for a tenant.
   * Uses a wildcard scan since rules can be cached under multiple service/venue combinations.
   */
  private async invalidateRulesCache(tenantId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      const pattern = `availability:rules:${tenantId}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      this.logger.warn(`Failed to invalidate availability rules cache for tenant ${tenantId}`);
    }
  }
}
