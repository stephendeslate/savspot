import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
  IsUrl,
  IsArray,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReviewPhotoDto {
  @ApiProperty({ example: 'https://cdn.example.com/photos/review-1.jpg' })
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photos/review-1-thumb.jpg' })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for display' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateReviewDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Booking ID this review is for',
  })
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example: 'Great service!',
    description: 'Review title',
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'The staff was very professional and the venue was clean.',
    description: 'Review body text',
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    type: [ReviewPhotoDto],
    description: 'Photos attached to the review',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewPhotoDto)
  @IsOptional()
  photos?: ReviewPhotoDto[];
}
