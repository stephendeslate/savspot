import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Service ID to check availability for' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: 'Date to check availability (YYYY-MM-DD)', example: '2026-03-15' })
  @IsDateString()
  date!: string;
}
