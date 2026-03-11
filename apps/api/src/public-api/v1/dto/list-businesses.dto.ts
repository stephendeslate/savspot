import { IsOptional, IsEnum, IsNumber, IsString, Min, Max, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const BUSINESS_CATEGORIES = ['VENUE', 'SALON', 'STUDIO', 'FITNESS', 'PROFESSIONAL', 'OTHER'] as const;

export class ListBusinessesDto {
  @ApiPropertyOptional({ enum: BUSINESS_CATEGORIES, description: 'Filter by business category' })
  @IsEnum(BUSINESS_CATEGORIES)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Latitude for location-based search' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for location-based search' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ValidateIf((o: ListBusinessesDto) => o.lat !== undefined)
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ description: 'Radius in kilometers for location search', default: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  @ValidateIf((o: ListBusinessesDto) => o.lat !== undefined)
  @IsOptional()
  radius_km?: number;

  @ApiPropertyOptional({ description: 'Search by business name' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  query?: string;

  @ApiPropertyOptional({ description: 'Cursor for pagination (opaque)' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
