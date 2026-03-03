import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Booking notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
