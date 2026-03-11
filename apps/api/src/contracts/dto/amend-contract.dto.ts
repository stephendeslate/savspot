import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AmendContractDto {
  @ApiPropertyOptional({
    description: 'Reason for the amendment',
    example: 'Adjusted service scope',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'JSON describing which sections changed',
    example: { section: 'pricing', oldValue: '100', newValue: '150' },
  })
  @IsObject()
  @IsOptional()
  sectionsChanged?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Change in contract value (positive or negative, in dollars)',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  valueChange?: number;
}
