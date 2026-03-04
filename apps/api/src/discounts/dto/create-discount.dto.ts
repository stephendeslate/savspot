import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED', 'FREE_HOURS'] as const;
const DISCOUNT_APPLICATIONS = [
  'AUTOMATIC',
  'CODE_REQUIRED',
  'ADMIN_ONLY',
] as const;

export class CreateDiscountDto {
  @ApiProperty({
    example: 'SUMMER20',
    description: 'Discount code (will be uppercased)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  code!: string;

  @ApiProperty({
    enum: DISCOUNT_TYPES,
    example: 'PERCENTAGE',
    description: 'Discount type',
  })
  @IsEnum(DISCOUNT_TYPES, {
    message: `type must be one of: ${DISCOUNT_TYPES.join(', ')}`,
  })
  type!: (typeof DISCOUNT_TYPES)[number];

  @ApiProperty({
    example: 20,
    description: 'Discount value (percentage or fixed amount)',
  })
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({
    enum: DISCOUNT_APPLICATIONS,
    default: 'CODE_REQUIRED',
    description: 'How the discount is applied',
  })
  @IsEnum(DISCOUNT_APPLICATIONS, {
    message: `application must be one of: ${DISCOUNT_APPLICATIONS.join(', ')}`,
  })
  @IsOptional()
  application?: (typeof DISCOUNT_APPLICATIONS)[number] = 'CODE_REQUIRED';

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
    default: true,
    description: 'Whether the discount is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
