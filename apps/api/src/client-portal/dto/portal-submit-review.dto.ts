import { IsString, IsInt, IsUUID, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortalSubmitReviewDto {
  @ApiProperty({ description: 'Booking ID being reviewed' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ description: 'Star rating (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Review text' })
  @IsOptional()
  @IsString()
  comment?: string;
}
