import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SYNC_TYPES = ['invoices', 'payments', 'clients'] as const;

export class SyncOptionsDto {
  @ApiPropertyOptional({
    enum: SYNC_TYPES,
    description: 'Type of data to sync (default: all)',
    example: 'invoices',
  })
  @IsEnum(SYNC_TYPES, {
    message: `syncType must be one of: ${SYNC_TYPES.join(', ')}`,
  })
  @IsOptional()
  syncType?: (typeof SYNC_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Force full sync instead of incremental',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  fullSync?: boolean;
}
