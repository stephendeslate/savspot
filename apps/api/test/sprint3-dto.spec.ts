import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WalkInBookingDto } from '@/bookings/dto/walk-in-booking.dto';
import { CancelBookingDto } from '@/bookings/dto/cancel-booking.dto';
import { RescheduleBookingDto } from '@/bookings/dto/reschedule-booking.dto';
import { UpdateBookingDto } from '@/bookings/dto/update-booking.dto';
import { MarkPaidDto } from '@/payments/dto/mark-paid.dto';
import { CreateRefundDto } from '@/payments/dto/create-refund.dto';
import { ConnectAccountDto } from '@/payments/dto/connect-account.dto';

// ---------------------------------------------------------------------------
// WalkInBookingDto
// ---------------------------------------------------------------------------

describe('WalkInBookingDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      startTime: '2026-03-15T10:00:00.000Z',
      endTime: '2026-03-15T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional fields', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      startTime: '2026-03-15T10:00:00.000Z',
      endTime: '2026-03-15T11:00:00.000Z',
      clientEmail: 'john@example.com',
      clientName: 'John Doe',
      notes: 'VIP client',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when serviceId is missing', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      startTime: '2026-03-15T10:00:00.000Z',
      endTime: '2026-03-15T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'serviceId')).toBe(true);
  });

  it('should fail when serviceId is not a UUID', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      serviceId: 'not-a-uuid',
      startTime: '2026-03-15T10:00:00.000Z',
      endTime: '2026-03-15T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'serviceId')).toBe(true);
  });

  it('should fail when startTime is not a valid ISO date', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      startTime: 'not-a-date',
      endTime: '2026-03-15T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'startTime')).toBe(true);
  });

  it('should fail when clientEmail is invalid', async () => {
    const dto = plainToInstance(WalkInBookingDto, {
      serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      startTime: '2026-03-15T10:00:00.000Z',
      endTime: '2026-03-15T11:00:00.000Z',
      clientEmail: 'not-an-email',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clientEmail')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CancelBookingDto
// ---------------------------------------------------------------------------

describe('CancelBookingDto', () => {
  it('should pass with valid reason', async () => {
    const dto = plainToInstance(CancelBookingDto, { reason: 'CLIENT_REQUEST' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all valid reasons', async () => {
    const reasons = ['CLIENT_REQUEST', 'PAYMENT_TIMEOUT', 'APPROVAL_TIMEOUT', 'DATE_TAKEN', 'ADMIN'];
    for (const reason of reasons) {
      const dto = plainToInstance(CancelBookingDto, { reason });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail with invalid reason', async () => {
    const dto = plainToInstance(CancelBookingDto, { reason: 'INVALID_REASON' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('should fail when reason is missing', async () => {
    const dto = plainToInstance(CancelBookingDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RescheduleBookingDto
// ---------------------------------------------------------------------------

describe('RescheduleBookingDto', () => {
  it('should pass with valid dates', async () => {
    const dto = plainToInstance(RescheduleBookingDto, {
      startTime: '2026-03-20T10:00:00.000Z',
      endTime: '2026-03-20T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when startTime is missing', async () => {
    const dto = plainToInstance(RescheduleBookingDto, {
      endTime: '2026-03-20T11:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'startTime')).toBe(true);
  });

  it('should fail when endTime is missing', async () => {
    const dto = plainToInstance(RescheduleBookingDto, {
      startTime: '2026-03-20T10:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'endTime')).toBe(true);
  });

  it('should fail with non-ISO date string', async () => {
    const dto = plainToInstance(RescheduleBookingDto, {
      startTime: 'tomorrow',
      endTime: 'next week',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// UpdateBookingDto
// ---------------------------------------------------------------------------

describe('UpdateBookingDto', () => {
  it('should pass with notes', async () => {
    const dto = plainToInstance(UpdateBookingDto, { notes: 'Some notes' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateBookingDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MarkPaidDto
// ---------------------------------------------------------------------------

describe('MarkPaidDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(MarkPaidDto, { amount: 5000, currency: 'USD' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional paymentMethod', async () => {
    const dto = plainToInstance(MarkPaidDto, {
      amount: 5000,
      currency: 'USD',
      paymentMethod: 'CHECK',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when amount is missing', async () => {
    const dto = plainToInstance(MarkPaidDto, { currency: 'USD' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('should fail when amount is zero', async () => {
    const dto = plainToInstance(MarkPaidDto, { amount: 0, currency: 'USD' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('should fail when amount is negative', async () => {
    const dto = plainToInstance(MarkPaidDto, { amount: -100, currency: 'USD' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('should fail when currency is missing', async () => {
    const dto = plainToInstance(MarkPaidDto, { amount: 5000 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'currency')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CreateRefundDto
// ---------------------------------------------------------------------------

describe('CreateRefundDto', () => {
  it('should pass with no fields (all optional)', async () => {
    const dto = plainToInstance(CreateRefundDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with amount and reason', async () => {
    const dto = plainToInstance(CreateRefundDto, {
      amount: 2500,
      reason: 'Client cancelled',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when amount is zero', async () => {
    const dto = plainToInstance(CreateRefundDto, { amount: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('should fail when amount is negative', async () => {
    const dto = plainToInstance(CreateRefundDto, { amount: -100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ConnectAccountDto
// ---------------------------------------------------------------------------

describe('ConnectAccountDto', () => {
  it('should pass with no fields (country defaults to US)', async () => {
    const dto = plainToInstance(ConnectAccountDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with explicit country', async () => {
    const dto = plainToInstance(ConnectAccountDto, { country: 'GB' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
