import {
  IsOptional,
  IsInt,
  IsUUID,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const;

export class ListReviewsDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by service ID',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Filter by exact rating (1-5)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    enum: SORT_ORDER_OPTIONS,
    default: 'desc',
    description: 'Sort order by creation date',
  })
  @IsEnum(SORT_ORDER_OPTIONS, {
    message: `sortOrder must be one of: ${SORT_ORDER_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  sortOrder?: (typeof SORT_ORDER_OPTIONS)[number] = 'desc';

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
  @IsOptional()
  limit?: number = 20;
}
