import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReschedulePortalBookingDto {
  @ApiProperty({
    example: '2026-03-20T10:00:00.000Z',
    description: 'New start time (ISO 8601)',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    example: '2026-03-20T11:00:00.000Z',
    description: 'New end time (ISO 8601)',
  })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({
    example: 'Schedule conflict — need to move to next week',
    description: 'Optional reason for the reschedule',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
