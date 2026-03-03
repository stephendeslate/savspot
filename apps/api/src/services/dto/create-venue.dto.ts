import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ example: 'Main Ballroom' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Our largest event space with a capacity of 300' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
  })
  @IsObject()
  @IsOptional()
  address?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 300, description: 'Maximum capacity' })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/venue1.jpg'],
    description: 'Array of image URLs',
  })
  @IsArray()
  @IsOptional()
  images?: string[];
}
