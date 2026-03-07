import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@Injectable()
export class TaxRatesService {
  private readonly logger = new Logger(TaxRatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.taxRate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateTaxRateDto) {
    // If setting as default, unset any existing default
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const taxRate = await this.prisma.taxRate.create({
      data: {
        tenantId,
        name: dto.name,
        rate: dto.rate,
        region: dto.region ?? null,
        isInclusive: dto.isInclusive ?? false,
        isDefault: dto.isDefault ?? false,
      },
    });

    this.logger.log(`Tax rate "${taxRate.name}" created for tenant ${tenantId}`);
    return taxRate;
  }

  async update(tenantId: string, id: string, dto: UpdateTaxRateDto) {
    const existing = await this.prisma.taxRate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Tax rate not found');
    }

    // If setting as default, unset any existing default
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.region !== undefined && { region: dto.region }),
        ...(dto.isInclusive !== undefined && { isInclusive: dto.isInclusive }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.taxRate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Tax rate not found');
    }

    // Soft delete
    return this.prisma.taxRate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
