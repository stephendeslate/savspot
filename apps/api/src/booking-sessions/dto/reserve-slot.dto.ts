import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReserveSlotDto {
  @ApiProperty({ description: 'Service ID for the reservation' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Venue ID' })
  @IsUUID()
  @IsOptional()
  venueId?: string;

  @ApiProperty({
    example: '2026-03-15T10:00:00.000Z',
    description: 'Start time (ISO 8601)',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    example: '2026-03-15T11:00:00.000Z',
    description: 'End time (ISO 8601)',
  })
  @IsDateString()
  endTime!: string;
}
