import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const;

export class AdminListReviewsDto {
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
    example: true,
    description: 'Filter by published status',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter to only reviews with responses',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  @IsOptional()
  hasResponse?: boolean;

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
