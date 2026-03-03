import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CANCELLATION_REASONS = [
  'CLIENT_REQUEST',
  'PAYMENT_TIMEOUT',
  'APPROVAL_TIMEOUT',
  'DATE_TAKEN',
  'ADMIN',
] as const;

export class CancelBookingDto {
  @ApiProperty({
    enum: CANCELLATION_REASONS,
    example: 'CLIENT_REQUEST',
    description: 'Reason for cancellation',
  })
  @IsEnum(CANCELLATION_REASONS, {
    message: `reason must be one of: ${CANCELLATION_REASONS.join(', ')}`,
  })
  reason!: string;
}
