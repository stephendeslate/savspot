import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a CalendarConnection's sync settings.
 */
export class UpdateConnectionDto {
  @ApiPropertyOptional({
    example: 15,
    description: 'Sync frequency in minutes (5–60)',
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  syncFrequencyMinutes?: number;

  @ApiPropertyOptional({
    example: ['primary', 'work@example.com'],
    description: 'Array of Google Calendar IDs to sync',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syncCalendars?: string[];

  @ApiPropertyOptional({
    example: 'TWO_WAY',
    description: 'Sync direction: ONE_WAY (outbound only) or TWO_WAY',
  })
  @IsOptional()
  @IsIn(['ONE_WAY', 'TWO_WAY'])
  syncDirection?: 'ONE_WAY' | 'TWO_WAY';
}
