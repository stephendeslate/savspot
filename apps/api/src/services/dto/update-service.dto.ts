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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationPolicyDto } from './create-service.dto';

const PRICING_MODELS = ['FIXED', 'HOURLY', 'TIERED', 'CUSTOM'] as const;
const CONFIRMATION_MODES = ['AUTO_CONFIRM', 'MANUAL_APPROVAL'] as const;

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Updated Service Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 15000.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: PRICING_MODELS, example: 'FIXED' })
  @IsEnum(PRICING_MODELS, {
    message: `pricingModel must be one of: ${PRICING_MODELS.join(', ')}`,
  })
  @IsOptional()
  pricingModel?: string;

  @ApiPropertyOptional({ enum: CONFIRMATION_MODES, example: 'AUTO_CONFIRM' })
  @IsEnum(CONFIRMATION_MODES, {
    message: `confirmationMode must be one of: ${CONFIRMATION_MODES.join(', ')}`,
  })
  @IsOptional()
  confirmationMode?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  venueId?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @Min(0)
  @IsOptional()
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @Min(0)
  @IsOptional()
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  guestConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  tierConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  depositConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  intakeFormConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ type: CancellationPolicyDto })
  @ValidateNested()
  @Type(() => CancellationPolicyDto)
  @IsOptional()
  cancellationPolicy?: CancellationPolicyDto;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  autoCancelOnOverdue?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxRescheduleCount?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @Min(0)
  @IsOptional()
  noShowGraceMinutes?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsInt()
  @Min(1)
  @IsOptional()
  approvalDeadlineHours?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
