import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingSessionDto {
  @ApiProperty({
    description: 'Step-specific fields to update',
    example: { selectedDate: '2026-03-15', selectedTime: '10:00' },
  })
  @IsObject()
  fields!: Record<string, unknown>;
}
