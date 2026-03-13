import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const FEEDBACK_TYPE_OPTIONS = [
  'FEATURE_REQUEST',
  'UX_FRICTION',
  'COMPARISON_NOTE',
  'GENERAL',
] as const;

const FEEDBACK_STATUS_OPTIONS = [
  'NEW',
  'ACKNOWLEDGED',
  'PLANNED',
  'SHIPPED',
  'DECLINED',
] as const;

export class ListFeedbackDto {
  @ApiPropertyOptional({
    enum: FEEDBACK_TYPE_OPTIONS,
    description: 'Filter by feedback type',
  })
  @IsEnum(FEEDBACK_TYPE_OPTIONS, {
    message: `type must be one of: ${FEEDBACK_TYPE_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  type?: (typeof FEEDBACK_TYPE_OPTIONS)[number];

  @ApiPropertyOptional({
    enum: FEEDBACK_STATUS_OPTIONS,
    description: 'Filter by feedback status',
  })
  @IsEnum(FEEDBACK_STATUS_OPTIONS, {
    message: `status must be one of: ${FEEDBACK_STATUS_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  status?: (typeof FEEDBACK_STATUS_OPTIONS)[number];

  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
  })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (default: 20)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class BulkUpdateFeedbackStatusDto {
  @ApiPropertyOptional({
    description: 'List of feedback IDs to update',
    type: [String],
  })
  @IsUUID(undefined, { each: true })
  ids!: string[];

  @ApiPropertyOptional({
    enum: FEEDBACK_STATUS_OPTIONS,
    description: 'New status to apply',
  })
  @IsEnum(FEEDBACK_STATUS_OPTIONS, {
    message: `status must be one of: ${FEEDBACK_STATUS_OPTIONS.join(', ')}`,
  })
  @IsString()
  status!: (typeof FEEDBACK_STATUS_OPTIONS)[number];
}
