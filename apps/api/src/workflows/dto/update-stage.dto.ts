import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const AUTOMATION_TYPES = [
  'EMAIL',
  'TASK',
  'QUOTE',
  'CONTRACT',
  'QUESTIONNAIRE',
  'REMINDER',
  'NOTIFICATION',
] as const;

const TRIGGER_TIMES = [
  'ON_CREATION',
  'AFTER_X_DAYS',
  'X_DAYS_BEFORE_BOOKING',
] as const;

const PROGRESSION_CONDITIONS = [
  'QUOTE_ACCEPTED',
  'PAYMENT_RECEIVED',
  'CONTRACT_SIGNED',
  'TASKS_COMPLETED',
] as const;

export class UpdateStageDto {
  @ApiPropertyOptional({ example: 'Updated Stage Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: AUTOMATION_TYPES })
  @IsEnum(AUTOMATION_TYPES, {
    message: `automationType must be one of: ${AUTOMATION_TYPES.join(', ')}`,
  })
  @IsOptional()
  automationType?: string;

  @ApiPropertyOptional({ example: { template_key: 'updated-template' } })
  @IsObject()
  @IsOptional()
  automationConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: TRIGGER_TIMES })
  @IsEnum(TRIGGER_TIMES, {
    message: `triggerTime must be one of: ${TRIGGER_TIMES.join(', ')}`,
  })
  @IsOptional()
  triggerTime?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  triggerDays?: number;

  @ApiPropertyOptional({ enum: PROGRESSION_CONDITIONS })
  @IsEnum(PROGRESSION_CONDITIONS, {
    message: `progressionCondition must be one of: ${PROGRESSION_CONDITIONS.join(', ')}`,
  })
  @IsOptional()
  progressionCondition?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;
}
