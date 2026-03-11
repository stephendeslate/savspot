import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TRIGGER_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BOOKING_COMPLETED',
  'PAYMENT_RECEIVED',
  'REMINDER_DUE',
  'PAYMENT_OVERDUE',
  'CONTRACT_SIGNED',
  'CONTRACT_EXPIRED',
  'QUOTE_ACCEPTED',
  'QUOTE_REJECTED',
  'QUOTE_EXPIRED',
  'REVIEW_SUBMITTED',
  'CLIENT_REGISTERED',
  'BOOKING_NO_SHOW',
  'BOOKING_WALK_IN',
  'INVOICE_OVERDUE',
] as const;

export class CreateTemplateDto {
  @ApiProperty({ example: 'New Client Onboarding' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Automated onboarding workflow for new clients' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TRIGGER_EVENTS, example: 'BOOKING_CONFIRMED' })
  @IsEnum(TRIGGER_EVENTS, {
    message: `triggerEvent must be one of: ${TRIGGER_EVENTS.join(', ')}`,
  })
  triggerEvent!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
