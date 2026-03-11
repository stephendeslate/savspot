import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PortalAcceptQuoteDto {
  @ApiPropertyOptional({ description: 'Base64 signature data URI' })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @ApiPropertyOptional({ description: 'Acceptance notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
