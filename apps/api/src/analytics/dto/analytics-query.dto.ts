import {
  IsISO8601,
  IsOptional,
  IsUUID,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const BOOKING_SOURCES = [
  'DIRECT',
  'DIRECTORY',
  'API',
  'WIDGET',
  'REFERRAL',
  'WALK_IN',
  'IMPORT',
] as const;

const GROUP_BY_OPTIONS = ['day', 'week', 'month'] as const;

export class AnalyticsQueryDto {
  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    description: 'Start date (ISO 8601)',
  })
  @IsISO8601()
  from!: string;

  @ApiProperty({
    example: '2026-03-31T23:59:59.999Z',
    description: 'End date (ISO 8601)',
  })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by staff user ID' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({
    enum: BOOKING_SOURCES,
    description: 'Filter by booking source',
  })
  @IsOptional()
  @IsIn(BOOKING_SOURCES, {
    message: `source must be one of: ${BOOKING_SOURCES.join(', ')}`,
  })
  source?: string;

  @ApiPropertyOptional({
    enum: GROUP_BY_OPTIONS,
    description: 'Group results by time period (default: day)',
  })
  @IsOptional()
  @IsIn(GROUP_BY_OPTIONS, {
    message: `groupBy must be one of: ${GROUP_BY_OPTIONS.join(', ')}`,
  })
  groupBy?: string;
}
