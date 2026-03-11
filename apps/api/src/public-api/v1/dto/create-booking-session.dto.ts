import { IsUUID, IsEmail, IsString, IsOptional, IsInt, IsBoolean, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingSessionDto {
  @ApiProperty({ description: 'Service ID to book' })
  @IsUUID()
  service_id!: string;

  @ApiProperty({ description: 'Client email address' })
  @IsEmail()
  client_email!: string;

  @ApiProperty({ description: 'Client full name' })
  @IsString()
  client_name!: string;

  @ApiProperty({ example: '2026-03-15', description: 'Booking date (ISO 8601)' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '10:00', description: 'Time slot (HH:MM)' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'time_slot must be in HH:MM format' })
  time_slot!: string;

  @ApiPropertyOptional({ description: 'Number of guests' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guest_count?: number;

  @ApiPropertyOptional({ description: 'Client consent for data processing' })
  @IsBoolean()
  @IsOptional()
  client_consent?: boolean;
}
