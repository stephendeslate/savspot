import { PrismaService } from '../../prisma/prisma.service';
import { ImportRowResult } from './client-import.handler';

export async function handleAppointmentRow(
  prisma: PrismaService,
  tenantId: string,
  row: Record<string, string>,
): Promise<ImportRowResult> {
  const clientEmail = row['clientEmail']?.trim();
  const serviceName = row['serviceName']?.trim();
  const startTime = row['startTime']?.trim();

  if (!clientEmail || !serviceName || !startTime) {
    return {
      status: 'ERROR',
      targetTable: 'Booking',
      errorMessage: `Missing required fields: ${[!clientEmail && 'clientEmail', !serviceName && 'serviceName', !startTime && 'startTime'].filter(Boolean).join(', ')}`,
    };
  }

  const client = await prisma.user.findFirst({
    where: { email: clientEmail },
    select: { id: true },
  });

  if (!client) {
    return {
      status: 'ERROR',
      targetTable: 'Booking',
      errorMessage: `Client not found for email: ${clientEmail}`,
    };
  }

  const service = await prisma.service.findFirst({
    where: { tenantId, name: serviceName },
    select: { id: true, durationMinutes: true, basePrice: true, currency: true },
  });

  if (!service) {
    return {
      status: 'ERROR',
      targetTable: 'Booking',
      errorMessage: `Service not found: ${serviceName}`,
    };
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    return {
      status: 'ERROR',
      targetTable: 'Booking',
      errorMessage: `Invalid startTime: ${startTime}`,
    };
  }

  const endTime = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  const booking = await prisma.booking.create({
    data: {
      tenantId,
      clientId: client.id,
      serviceId: service.id,
      startTime: start,
      endTime,
      totalAmount: service.basePrice,
      currency: service.currency,
      status: 'CONFIRMED',
      source: 'IMPORT',
    },
  });

  return {
    status: 'IMPORTED',
    targetTable: 'Booking',
    targetId: booking.id,
  };
}
