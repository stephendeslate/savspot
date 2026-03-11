import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CONTRACT_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_SIGNED',
  'SIGNED',
  'EXPIRED',
  'VOID',
  'AMENDED',
] as const;

export class ListContractsDto {
  @ApiPropertyOptional({
    enum: CONTRACT_STATUSES,
    description: 'Filter by contract status',
  })
  @IsEnum(CONTRACT_STATUSES, {
    message: `status must be one of: ${CONTRACT_STATUSES.join(', ')}`,
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
  @IsOptional()
  limit?: number = 20;
}
