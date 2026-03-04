import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED', 'FREE_HOURS'] as const;
const DISCOUNT_APPLICATIONS = [
  'AUTOMATIC',
  'CODE_REQUIRED',
  'ADMIN_ONLY',
] as const;

export class UpdateDiscountDto {
  @ApiPropertyOptional({
    example: 'SUMMER20',
    description: 'Discount code (will be uppercased)',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    enum: DISCOUNT_TYPES,
    example: 'PERCENTAGE',
    description: 'Discount type',
  })
  @IsEnum(DISCOUNT_TYPES, {
    message: `type must be one of: ${DISCOUNT_TYPES.join(', ')}`,
  })
  @IsOptional()
  type?: (typeof DISCOUNT_TYPES)[number];

  @ApiPropertyOptional({
    example: 20,
    description: 'Discount value (percentage or fixed amount)',
  })
  @IsNumber()
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({
    enum: DISCOUNT_APPLICATIONS,
    description: 'How the discount is applied',
  })
  @IsEnum(DISCOUNT_APPLICATIONS, {
    message: `application must be one of: ${DISCOUNT_APPLICATIONS.join(', ')}`,
  })
  @IsOptional()
  application?: (typeof DISCOUNT_APPLICATIONS)[number];

  @ApiPropertyOptional({
    example: 5000,
    description: 'Minimum booking amount in minor units (cents)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minBookingAmount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum number of times this discount can be used',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Valid from date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.999Z',
    description: 'Valid until date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the discount is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
