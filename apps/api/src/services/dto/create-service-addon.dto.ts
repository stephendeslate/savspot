import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceAddonDto {
  @ApiProperty({ example: 'Premium Setup' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Includes additional decorations and lighting' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 25.0, description: 'Add-on price in major currency units' })
  @IsNumber()
  @Min(0)
  price!: number;

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
