import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlockedDateDto {
  @ApiProperty({ example: '2026-03-25', description: 'Date to block (ISO date)' })
  @IsDateString()
  blockedDate!: string;

  @ApiPropertyOptional({ example: 'Holiday closure', description: 'Reason for blocking' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Service ID (null = all services)' })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Venue ID' })
  @IsUUID()
  @IsOptional()
  venueId?: string;
}
