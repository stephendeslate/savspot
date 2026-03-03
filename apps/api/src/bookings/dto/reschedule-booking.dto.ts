import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
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
}
