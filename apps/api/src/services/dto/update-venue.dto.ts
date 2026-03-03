import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'Updated Venue Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: {
      street: '456 Oak Ave',
      city: 'Berlin',
      country: 'DE',
    },
  })
  @IsObject()
  @IsOptional()
  address?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 500 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/updated.jpg'],
  })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
