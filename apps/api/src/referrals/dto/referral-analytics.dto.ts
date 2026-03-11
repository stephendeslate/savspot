import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Start date for analytics period',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'End date for analytics period',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
