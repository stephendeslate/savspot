import { IsUUID, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Service ID to check availability for' })
  @IsUUID()
  service_id!: string;

  @ApiProperty({ example: '2026-03-15', description: 'Date to check (ISO 8601 date)' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Optional staff/provider ID' })
  @IsUUID()
  @IsOptional()
  staff_id?: string;

  @ApiPropertyOptional({ description: 'Number of guests', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guest_count?: number;
}
