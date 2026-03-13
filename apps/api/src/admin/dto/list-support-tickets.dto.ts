import {
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const TICKET_STATUS_OPTIONS = [
  'NEW',
  'AI_INVESTIGATING',
  'AI_RESOLVED',
  'NEEDS_MANUAL_REVIEW',
  'RESOLVED',
  'CLOSED',
] as const;

const TICKET_CATEGORY_OPTIONS = [
  'BUG',
  'FEATURE_REQUEST',
  'QUESTION',
  'ACCOUNT_ISSUE',
  'PAYMENT_ISSUE',
  'OTHER',
] as const;

export class ListSupportTicketsDto {
  @ApiPropertyOptional({
    enum: TICKET_STATUS_OPTIONS,
    description: 'Filter by ticket status',
  })
  @IsEnum(TICKET_STATUS_OPTIONS, {
    message: `status must be one of: ${TICKET_STATUS_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  status?: (typeof TICKET_STATUS_OPTIONS)[number];

  @ApiPropertyOptional({
    enum: TICKET_CATEGORY_OPTIONS,
    description: 'Filter by ticket category',
  })
  @IsEnum(TICKET_CATEGORY_OPTIONS, {
    message: `category must be one of: ${TICKET_CATEGORY_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  category?: (typeof TICKET_CATEGORY_OPTIONS)[number];

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
