import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export class ListInvoicesDto {
  @ApiPropertyOptional({
    enum: INVOICE_STATUSES,
    description: 'Filter by invoice status',
  })
  @IsEnum(INVOICE_STATUSES, {
    message: `status must be one of: ${INVOICE_STATUSES.join(', ')}`,
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
