interface DecimalLike {
  toNumber(): number;
}

interface BookingRecord {
  id: string;
  status: string;
  startTime: Date;
  endTime: Date;
  totalAmount: DecimalLike | number;
  currency: string;
  guestCount: number | null;
  service: {
    name: string;
  } | null;
}

export interface BookingResponse {
  id: string;
  status: string;
  serviceName: string | null;
  startTime: string;
  endTime: string;
  totalAmount: number;
  currency: string;
  guestCount: number | null;
}

export function transformBooking(booking: BookingRecord): BookingResponse {
  const totalAmount =
    typeof booking.totalAmount === 'number'
      ? booking.totalAmount
      : booking.totalAmount.toNumber();

  return {
    id: booking.id,
    status: booking.status,
    serviceName: booking.service?.name ?? null,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    totalAmount,
    currency: booking.currency,
    guestCount: booking.guestCount,
  };
}
