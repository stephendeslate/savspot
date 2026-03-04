import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelPortalBookingDto {
  @ApiPropertyOptional({
    example: 'Schedule conflict',
    description: 'Optional reason for cancellation',
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
