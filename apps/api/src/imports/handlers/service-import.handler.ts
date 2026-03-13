import { Decimal } from '../../../../../prisma/generated/prisma/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportRowResult } from './client-import.handler';

export async function handleServiceRow(
  prisma: PrismaService,
  tenantId: string,
  row: Record<string, string>,
): Promise<ImportRowResult> {
  const name = row['name']?.trim();
  const durationMinutes = row['durationMinutes']?.trim();
  const price = row['price']?.trim();
  const currency = row['currency']?.trim() || 'USD';

  if (!name || !durationMinutes || !price) {
    return {
      status: 'ERROR',
      targetTable: 'Service',
      errorMessage: `Missing required fields: ${[!name && 'name', !durationMinutes && 'durationMinutes', !price && 'price'].filter(Boolean).join(', ')}`,
    };
  }

  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    return {
      status: 'ERROR',
      targetTable: 'Service',
      errorMessage: `Invalid durationMinutes: ${durationMinutes}`,
    };
  }

  let priceDecimal: Decimal;
  try {
    priceDecimal = new Decimal(price);
  } catch {
    return {
      status: 'ERROR',
      targetTable: 'Service',
      errorMessage: `Invalid price: ${price}`,
    };
  }

  if (priceDecimal.isNegative()) {
    return {
      status: 'ERROR',
      targetTable: 'Service',
      errorMessage: `Invalid price: ${price}`,
    };
  }

  const existing = await prisma.service.findFirst({
    where: { tenantId, name },
    select: { id: true },
  });

  if (existing) {
    return {
      status: 'SKIPPED_DUPLICATE',
      targetTable: 'Service',
      targetId: existing.id,
      errorMessage: 'Service with this name already exists',
    };
  }

  const service = await prisma.service.create({
    data: {
      tenantId,
      name,
      durationMinutes: duration,
      basePrice: priceDecimal,
      currency,
      description: row['description']?.trim() || null,
      isActive: true,
    },
  });

  return {
    status: 'IMPORTED',
    targetTable: 'Service',
    targetId: service.id,
  };
}
