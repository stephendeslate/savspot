import {
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SOURCE_PLATFORMS = [
  'BOOKSY',
  'FRESHA',
  'SQUARE',
  'VAGARO',
  'MINDBODY',
  'CSV_GENERIC',
  'JSON_GENERIC',
] as const;

const IMPORT_TYPES = ['CLIENTS', 'SERVICES', 'APPOINTMENTS', 'FULL'] as const;

export class CreateImportDto {
  @ApiProperty({
    enum: SOURCE_PLATFORMS,
    example: 'CSV_GENERIC',
    description: 'Source platform of the import data',
  })
  @IsEnum(SOURCE_PLATFORMS)
  sourcePlatform!: (typeof SOURCE_PLATFORMS)[number];

  @ApiProperty({
    enum: IMPORT_TYPES,
    example: 'CLIENTS',
    description: 'Type of data being imported',
  })
  @IsEnum(IMPORT_TYPES)
  importType!: (typeof IMPORT_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Column mapping for CSV imports (JSON object)',
  })
  @IsOptional()
  columnMapping?: Record<string, string>;
}
