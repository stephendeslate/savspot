import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SORT_BY_OPTIONS = [
  'name',
  'lastVisit',
  'totalBookings',
  'totalRevenue',
] as const;

const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const;

export class ListClientsDto {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by name, email, or phone',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'vip,returning',
    description: 'Filter by tags (comma-separated)',
  })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiPropertyOptional({
    enum: SORT_BY_OPTIONS,
    default: 'lastVisit',
    description: 'Sort field',
  })
  @IsEnum(SORT_BY_OPTIONS, {
    message: `sortBy must be one of: ${SORT_BY_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  sortBy?: (typeof SORT_BY_OPTIONS)[number] = 'lastVisit';

  @ApiPropertyOptional({
    enum: SORT_ORDER_OPTIONS,
    default: 'desc',
    description: 'Sort order',
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
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
