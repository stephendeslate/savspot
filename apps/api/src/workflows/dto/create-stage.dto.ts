import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class CreateStageDto {
  @ApiProperty({ example: 'Send Welcome Email' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AUTOMATION_TYPES, example: 'EMAIL' })
  @IsEnum(AUTOMATION_TYPES, {
    message: `automationType must be one of: ${AUTOMATION_TYPES.join(', ')}`,
  })
  automationType!: string;

  @ApiProperty({ example: { template_key: 'welcome-email' } })
  @IsObject()
  automationConfig!: Record<string, unknown>;

  @ApiProperty({ enum: TRIGGER_TIMES, example: 'ON_CREATION' })
  @IsEnum(TRIGGER_TIMES, {
    message: `triggerTime must be one of: ${TRIGGER_TIMES.join(', ')}`,
  })
  triggerTime!: string;

  @ApiPropertyOptional({ example: 3, description: 'Number of days for AFTER_X_DAYS or X_DAYS_BEFORE_BOOKING' })
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

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;
}
