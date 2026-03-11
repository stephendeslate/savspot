import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuoteLineItemDto {
  @ApiProperty({
    example: 'Photography session — 2 hours',
    description: 'Line item description',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1, description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 150.0, description: 'Unit price in dollars' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({
    example: 0.08,
    description: 'Tax rate as a decimal (e.g. 0.08 for 8%)',
  })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Sort order for display',
  })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
