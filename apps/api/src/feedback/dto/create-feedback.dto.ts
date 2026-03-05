import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const FEEDBACK_TYPES = [
  'FEATURE_REQUEST',
  'UX_FRICTION',
  'COMPARISON_NOTE',
  'GENERAL',
] as const;

export class CreateFeedbackDto {
  @ApiProperty({
    enum: FEEDBACK_TYPES,
    example: 'FEATURE_REQUEST',
    description: 'Type of feedback',
  })
  @IsEnum(FEEDBACK_TYPES, {
    message: `type must be one of: ${FEEDBACK_TYPES.join(', ')}`,
  })
  type!: 'FEATURE_REQUEST' | 'UX_FRICTION' | 'COMPARISON_NOTE' | 'GENERAL';

  @ApiProperty({
    example: 'It would be great to have a dark mode option',
    description: 'Feedback body text',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    example: '/dashboard/settings',
    description: 'Page the feedback was submitted from',
  })
  @IsString()
  @IsOptional()
  contextPage?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/screenshots/feedback-123.png',
    description: 'URL of an uploaded screenshot',
  })
  @IsUrl()
  @IsOptional()
  screenshotUrl?: string;
}
