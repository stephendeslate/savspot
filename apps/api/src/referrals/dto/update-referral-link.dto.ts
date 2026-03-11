import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReferralLinkDto {
  @ApiPropertyOptional({ example: 'Updated Promo', description: 'Name of the referral link' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the link is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 15,
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
