import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAvailabilityDto {
  @ApiProperty({ description: 'Service ID to check availability for' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: '2026-03-15', description: 'Start date (ISO date)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-03-21', description: 'End date (ISO date)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Optional venue ID filter' })
  @IsUUID()
  @IsOptional()
  venueId?: string;
}
