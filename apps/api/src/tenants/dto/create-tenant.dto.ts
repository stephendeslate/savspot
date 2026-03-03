import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const BUSINESS_CATEGORIES = [
  'VENUE',
  'SALON',
  'STUDIO',
  'FITNESS',
  'PROFESSIONAL',
  'OTHER',
] as const;

export class CreateTenantDto {
  @ApiProperty({ example: 'Luxe Event Venue' })
  @IsString()
  name!: string;

  @ApiProperty({
    enum: BUSINESS_CATEGORIES,
    example: 'VENUE',
    description: 'Business category',
  })
  @IsEnum(BUSINESS_CATEGORIES, {
    message: `category must be one of: ${BUSINESS_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone!: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  country!: string;

  @ApiPropertyOptional({ example: 'A premium event space in downtown NYC' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@luxevenue.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+12125551234' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    description: 'JSON address object',
  })
  @IsObject()
  @IsOptional()
  address?: Record<string, unknown>;
}
