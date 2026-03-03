import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const BUSINESS_CATEGORIES = [
  'VENUE',
  'SALON',
  'STUDIO',
  'FITNESS',
  'PROFESSIONAL',
  'OTHER',
] as const;

export class ApplyPresetDto {
  @ApiProperty({
    enum: BUSINESS_CATEGORIES,
    example: 'VENUE',
    description: 'Business category to apply preset for',
  })
  @IsEnum(BUSINESS_CATEGORIES, {
    message: `category must be one of: ${BUSINESS_CATEGORIES.join(', ')}`,
  })
  category!: string;
}
