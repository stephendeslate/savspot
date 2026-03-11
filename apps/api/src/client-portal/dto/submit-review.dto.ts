import { IsUUID, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitReviewDto {
  @ApiProperty({ description: 'UUID of the booking to review' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Great service!' })
  @IsString()
  @IsOptional()
  comment?: string;
}
