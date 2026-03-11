import { IsArray, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const EXPORT_FORMATS = ['csv', 'json'] as const;

const VALID_METRICS = [
  'overview',
  'revenue',
  'bookings',
  'no-shows',
  'clients',
  'funnel',
  'utilization',
  'staff-performance',
  'benchmarks',
] as const;

export class ExportDto {
  @ApiProperty({
    enum: EXPORT_FORMATS,
    description: 'Export format',
  })
  @IsIn(EXPORT_FORMATS, {
    message: `format must be one of: ${EXPORT_FORMATS.join(', ')}`,
  })
  format!: string;

  @ApiProperty({
    type: [String],
    enum: VALID_METRICS,
    description: 'Metrics to export',
  })
  @IsArray()
  @IsString({ each: true })
  metrics!: string[];
}
