import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, description: 'Rating from 1 to 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    example: 'Updated title',
    description: 'Review title',
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated body text.',
    description: 'Review body text',
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the review is published',
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
