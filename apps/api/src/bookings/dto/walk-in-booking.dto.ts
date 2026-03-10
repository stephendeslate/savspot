import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalkInBookingDto {
  @ApiProperty({ description: 'Service ID for the walk-in booking' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Client email (optional for walk-ins)',
  })
  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Client name (optional for walk-ins)',
  })
  @IsString()
  @IsOptional()
  clientName?: string;

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

  @ApiPropertyOptional({ description: 'Notes for the booking' })
  @IsString()
  @IsOptional()
  notes?: string;
}
