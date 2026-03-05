import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkPaidDto {
  @ApiProperty({
    example: 50,
    description: 'Payment amount in major units (e.g. dollars)',
  })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'ISO 4217 currency code',
  })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({
    example: 'CASH',
    description: 'Payment method description (default: CASH)',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string = 'CASH';
}
