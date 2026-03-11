import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuoteLineItemDto {
  @ApiPropertyOptional({
    example: 'Photography session — 3 hours',
    description: 'Line item description',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'Quantity' })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 200.0, description: 'Unit price in dollars' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({
    example: 0.08,
    description: 'Tax rate as a decimal',
  })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Sort order for display',
  })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
