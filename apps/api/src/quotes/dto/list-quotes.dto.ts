import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const QUOTE_STATUSES = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
] as const;

export class ListQuotesDto {
  @ApiPropertyOptional({
    enum: QUOTE_STATUSES,
    description: 'Filter by quote status',
  })
  @IsEnum(QUOTE_STATUSES, {
    message: `status must be one of: ${QUOTE_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: string;

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
