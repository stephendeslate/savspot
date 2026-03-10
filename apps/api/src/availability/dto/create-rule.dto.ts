import {
  IsInt,
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({
    example: 1,
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00', description: 'Start time (HH:mm format)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @ApiProperty({ example: '17:00', description: 'End time (HH:mm format)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @ApiPropertyOptional({ description: 'Service ID (null = tenant-wide rule)' })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Venue ID' })
  @IsUUID()
  @IsOptional()
  venueId?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the rule is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
