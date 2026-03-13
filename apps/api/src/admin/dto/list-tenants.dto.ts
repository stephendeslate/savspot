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

const TENANT_STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export class ListTenantsDto {
  @ApiPropertyOptional({
    example: 'acme',
    description: 'Search by name or slug',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: TENANT_STATUS_OPTIONS,
    description: 'Filter by tenant status',
  })
  @IsEnum(TENANT_STATUS_OPTIONS, {
    message: `status must be one of: ${TENANT_STATUS_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  status?: (typeof TENANT_STATUS_OPTIONS)[number];

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
