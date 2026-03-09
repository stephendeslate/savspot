import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsObject,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Updated Venue Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'A longer category description' })
  @IsString()
  @IsOptional()
  categoryDescription?: string;

  @ApiPropertyOptional({ example: 'Barbershop' })
  @IsString()
  @IsOptional()
  categoryLabel?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsString()
  @IsOptional()
  coverPhotoUrl?: string;

  @ApiPropertyOptional({ example: '#4A90D9' })
  @Matches(/^#[0-9a-fA-F]{3,8}$/, { message: 'brandColor must be a valid hex color (e.g. #fff or #4A90D9)' })
  @IsOptional()
  brandColor?: string;

  @ApiPropertyOptional({ example: 'America/Chicago' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'DE' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: {
      street: '456 Oak Ave',
      city: 'Berlin',
      country: 'DE',
    },
  })
  @IsObject()
  @IsOptional()
  address?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'info@venue.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+4930123456' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
