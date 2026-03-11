import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptQuoteDto {
  @ApiProperty({
    description: 'Signature data (SVG data URI)',
  })
  @IsString()
  @IsNotEmpty()
  signatureData!: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Selected option ID (required if quote has options)',
  })
  @IsUUID()
  @IsOptional()
  optionId?: string;
}
