import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PAYMENT_STATUSES = [
  'CREATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export class ListPaymentsDto {
  @ApiPropertyOptional({ description: 'Filter by booking ID' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    enum: PAYMENT_STATUSES,
    description: 'Filter by payment status',
  })
  @IsEnum(PAYMENT_STATUSES, {
    message: `status must be one of: ${PAYMENT_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Filter by start date (ISO date string)',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description: 'Filter by end date (ISO date string)',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by client name or email',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (default: 20)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
