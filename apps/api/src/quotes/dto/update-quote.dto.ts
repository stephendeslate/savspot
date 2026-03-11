import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuoteDto {
  @ApiPropertyOptional({ description: 'Additional notes for the quote' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-04-01T00:00:00Z',
    description: 'Quote expiration date',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Currency code',
  })
  @IsString()
  @IsOptional()
  currency?: string;
}
