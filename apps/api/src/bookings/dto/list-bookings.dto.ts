import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsInt,
  IsIn,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export class ListBookingsDto {
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
    enum: BOOKING_STATUSES,
    description: 'Filter by booking status',
  })
  @IsEnum(BOOKING_STATUSES, {
    message: `status must be one of: ${BOOKING_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

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

  @ApiPropertyOptional({
    enum: ['startTime', 'createdAt', 'status', 'totalAmount'],
    description: 'Field to sort by (default: startTime)',
  })
  @IsIn(['startTime', 'createdAt', 'status', 'totalAmount'])
  @IsOptional()
  sortBy?: string = 'startTime';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
