import { IsString, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const OVERRIDE_TYPES = [
  'SKIP',
  'DISABLE_AUTOMATION',
  'CUSTOM_TIMING',
  'ADD_STAGE',
] as const;

export class CreateBookingOverrideDto {
  @ApiPropertyOptional({ description: 'Stage ID to override (null for template-level override)' })
  @IsUUID()
  @IsOptional()
  stageId?: string;

  @ApiProperty({ enum: OVERRIDE_TYPES, example: 'SKIP' })
  @IsEnum(OVERRIDE_TYPES, {
    message: `overrideType must be one of: ${OVERRIDE_TYPES.join(', ')}`,
  })
  overrideType!: string;

  @ApiPropertyOptional({ example: { delay_days: 2 } })
  @IsObject()
  @IsOptional()
  overrideConfig?: Record<string, unknown>;

  @ApiProperty({ example: 'Client requested to skip this stage' })
  @IsString()
  reason!: string;
}
