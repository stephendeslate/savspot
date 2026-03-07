import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxRateDto {
  @ApiProperty({ example: 'Sales Tax' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 8.875, description: 'Tax rate as percentage' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  rate!: number;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isInclusive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
