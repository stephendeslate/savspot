import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceAddonDto {
  @ApiPropertyOptional({ example: 'Premium Setup' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Includes additional decorations and lighting' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 25.0, description: 'Add-on price in major currency units' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether this add-on is required' })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Display sort order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
