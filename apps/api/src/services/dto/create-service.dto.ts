import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const LATE_CANCEL_FEE_TYPES = ['percentage', 'fixed'] as const;

export class CancellationPolicyDto {
  @ApiPropertyOptional({ example: 24, description: 'Hours before appointment for free cancellation' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  free_cancellation_hours?: number;

  @ApiPropertyOptional({
    enum: LATE_CANCEL_FEE_TYPES,
    example: 'percentage',
    description: 'Type of late cancellation fee',
  })
  @IsEnum(LATE_CANCEL_FEE_TYPES, {
    message: `late_cancel_fee_type must be one of: ${LATE_CANCEL_FEE_TYPES.join(', ')}`,
  })
  @IsOptional()
  late_cancel_fee_type?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ example: 50, description: 'Late cancellation fee amount (percentage or fixed)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  late_cancel_fee_amount?: number;

  @ApiPropertyOptional({ example: 2, description: 'Hours before appointment when no refund is given' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  no_refund_hours?: number;
}

const PRICING_MODELS = ['FIXED', 'HOURLY', 'TIERED', 'CUSTOM'] as const;
const CONFIRMATION_MODES = ['AUTO_CONFIRM', 'MANUAL_APPROVAL'] as const;

export class CreateServiceDto {
  @ApiProperty({ example: 'Full-Day Venue Rental' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ example: 480, description: 'Duration in minutes (default: 60)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 5000.0,
    description: 'Base price as decimal (e.g., 5000.00 for $5,000)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 'Premium full-day rental with catering area' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: PRICING_MODELS,
    example: 'FIXED',
    description: 'Pricing model',
  })
  @IsEnum(PRICING_MODELS, {
    message: `pricingModel must be one of: ${PRICING_MODELS.join(', ')}`,
  })
  @IsOptional()
  pricingModel?: string;

  @ApiPropertyOptional({
    enum: CONFIRMATION_MODES,
    example: 'AUTO_CONFIRM',
    description: 'Booking confirmation mode',
  })
  @IsEnum(CONFIRMATION_MODES, {
    message: `confirmationMode must be one of: ${CONFIRMATION_MODES.join(', ')}`,
  })
  @IsOptional()
  confirmationMode?: string;

  @ApiPropertyOptional({ description: 'UUID of the service category' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'UUID of the venue' })
  @IsUUID()
  @IsOptional()
  venueId?: string;

  @ApiPropertyOptional({ example: 15, description: 'Buffer before appointment (minutes)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ example: 15, description: 'Buffer after appointment (minutes)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({
    example: { minGuests: 1, maxGuests: 200 },
    description: 'Guest configuration JSON',
  })
  @IsObject()
  @IsOptional()
  guestConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { tiers: [{ name: 'Basic', price: 5000 }] },
    description: 'Tiered pricing configuration JSON',
  })
  @IsObject()
  @IsOptional()
  tierConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { required: true, amount: 1000 },
    description: 'Deposit configuration JSON',
  })
  @IsObject()
  @IsOptional()
  depositConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { fields: [{ name: 'allergies', type: 'text', required: false }] },
    description: 'Intake form configuration JSON',
  })
  @IsObject()
  @IsOptional()
  intakeFormConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: CancellationPolicyDto,
    description: 'Cancellation policy configuration',
    example: {
      free_cancellation_hours: 24,
      late_cancel_fee_type: 'percentage',
      late_cancel_fee_amount: 50,
      no_refund_hours: 2,
    },
  })
  @ValidateNested()
  @Type(() => CancellationPolicyDto)
  @IsOptional()
  cancellationPolicy?: CancellationPolicyDto;

  @ApiPropertyOptional({ example: false, description: 'Auto cancel on overdue payment' })
  @IsBoolean()
  @IsOptional()
  autoCancelOnOverdue?: boolean;

  @ApiPropertyOptional({ example: 3, description: 'Max number of reschedules allowed' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxRescheduleCount?: number;

  @ApiPropertyOptional({ example: 15, description: 'Grace period in minutes before marking no-show' })
  @IsInt()
  @Min(0)
  @IsOptional()
  noShowGraceMinutes?: number;

  @ApiPropertyOptional({ example: 24, description: 'Hours before auto-rejecting unapproved bookings' })
  @IsInt()
  @Min(1)
  @IsOptional()
  approvalDeadlineHours?: number;

  @ApiPropertyOptional({ example: 0, description: 'Display sort order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
