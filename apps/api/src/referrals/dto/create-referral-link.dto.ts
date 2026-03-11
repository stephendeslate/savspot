import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralLinkDto {
  @ApiProperty({ example: 'Summer Promo', description: 'Name of the referral link' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'SUMMER2026',
    description: 'Custom referral code (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: 'code must contain only alphanumeric characters, hyphens, and underscores',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Commission percentage (0-100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Expiry date for the referral link',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
