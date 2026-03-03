import { IsInt, IsOptional, IsUUID, IsObject, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiPropertyOptional({ example: 2, description: 'Current step index' })
  @IsInt()
  @Min(0)
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({
    example: { selectedDate: '2026-03-15', selectedTime: '10:00' },
    description: 'Session data payload (merged with existing data)',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Service ID (if changed during session)' })
  @IsUUID('4')
  @IsOptional()
  serviceId?: string;
}
