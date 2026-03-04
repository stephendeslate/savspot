import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all discounts for a tenant.
   */
  async findAll(tenantId: string) {
    return this.prisma.discount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new discount with uppercase code.
   * Validates uniqueness of code within the tenant.
   */
  async create(tenantId: string, data: CreateDiscountDto) {
    const code = data.code.toUpperCase();

    // Check for uniqueness of code within tenant
    const existing = await this.prisma.discount.findFirst({
      where: { tenantId, code },
    });

    if (existing) {
      throw new ConflictException(
        `Discount code "${code}" already exists for this tenant`,
      );
    }

    const discount = await this.prisma.discount.create({
      data: {
        tenantId,
        name: code,
        code,
        type: data.type,
        value: data.value,
        application: data.application ?? 'CODE_REQUIRED',
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validTo ? new Date(data.validTo) : null,
        usageLimit: data.maxUses ?? null,
        minOrderAmount: data.minBookingAmount ?? null,
        isActive: data.isActive ?? true,
      },
    });

    this.logger.log(
      `Created discount ${discount.id} (${code}) for tenant ${tenantId}`,
    );

    return discount;
  }

  /**
   * Update an existing discount.
   */
  async update(tenantId: string, id: string, data: UpdateDiscountDto) {
    const discount = await this.prisma.discount.findFirst({
      where: { id, tenantId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    // If code is being updated, check uniqueness
    if (data.code) {
      const code = data.code.toUpperCase();
      const existing = await this.prisma.discount.findFirst({
        where: { tenantId, code, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException(
          `Discount code "${code}" already exists for this tenant`,
        );
      }
    }

    const updated = await this.prisma.discount.update({
      where: { id },
      data: {
        ...(data.code !== undefined && {
          code: data.code.toUpperCase(),
          name: data.code.toUpperCase(),
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.application !== undefined && {
          application: data.application,
        }),
        ...(data.validFrom !== undefined && {
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
        }),
        ...(data.validTo !== undefined && {
          validUntil: data.validTo ? new Date(data.validTo) : null,
        }),
        ...(data.maxUses !== undefined && { usageLimit: data.maxUses }),
        ...(data.minBookingAmount !== undefined && {
          minOrderAmount: data.minBookingAmount,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    this.logger.log(`Updated discount ${id} for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Soft-deactivate a discount by setting isActive = false.
   */
  async deactivate(tenantId: string, id: string) {
    const discount = await this.prisma.discount.findFirst({
      where: { id, tenantId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    const updated = await this.prisma.discount.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated discount ${id} for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Validate a discount code against a tenant.
   * Checks: exists, active, valid dates, max uses not exceeded, min booking amount.
   * Returns the discount details if valid.
   */
  async validateCode(
    tenantId: string,
    code: string,
    bookingAmount?: number,
  ) {
    const upperCode = code.toUpperCase();

    const discount = await this.prisma.discount.findFirst({
      where: { tenantId, code: upperCode },
    });

    if (!discount) {
      throw new BadRequestException('Discount code not found');
    }

    if (!discount.isActive) {
      throw new BadRequestException('Discount code is no longer active');
    }

    const now = new Date();

    if (discount.validFrom && now < discount.validFrom) {
      throw new BadRequestException('Discount code is not yet valid');
    }

    if (discount.validUntil && now > discount.validUntil) {
      throw new BadRequestException('Discount code has expired');
    }

    if (
      discount.usageLimit !== null &&
      discount.usageCount >= discount.usageLimit
    ) {
      throw new BadRequestException(
        'Discount code has reached its maximum usage limit',
      );
    }

    if (
      discount.minOrderAmount !== null &&
      bookingAmount !== undefined &&
      bookingAmount < Number(discount.minOrderAmount)
    ) {
      throw new BadRequestException(
        `Minimum booking amount of ${discount.minOrderAmount} required for this discount`,
      );
    }

    return {
      id: discount.id,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      application: discount.application,
    };
  }

  /**
   * Validate a discount code for a specific booking session.
   * Looks up the session to get the tenantId and booking amount,
   * then delegates to validateCode.
   */
  async validateForSession(sessionId: string, code: string) {
    const session = await this.prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: {
        service: {
          select: { basePrice: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Booking session not found');
    }

    const bookingAmount = session.service
      ? Number(session.service.basePrice)
      : undefined;

    return this.validateCode(session.tenantId, code, bookingAmount);
  }
}
