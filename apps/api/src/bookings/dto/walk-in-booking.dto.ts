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
    description: 'Existing client ID (mutually exclusive with clientEmail/clientName)',
  })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Client email — used to find or create a client (ignored if clientId is provided)',
  })
  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Client name — used when creating a new client (ignored if clientId is provided)',
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
