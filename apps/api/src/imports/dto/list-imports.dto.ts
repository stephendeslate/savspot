import {
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const IMPORT_JOB_STATUSES = [
  'PENDING',
  'MAPPING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export class ListImportsDto {
  @ApiPropertyOptional({
    enum: IMPORT_JOB_STATUSES,
    description: 'Filter by import job status',
  })
  @IsEnum(IMPORT_JOB_STATUSES)
  @IsOptional()
  status?: (typeof IMPORT_JOB_STATUSES)[number];

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
