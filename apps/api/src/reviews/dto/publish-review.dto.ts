import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishReviewDto {
  @ApiProperty({
    example: true,
    description: 'Whether the review should be published',
  })
  @IsBoolean()
  isPublished!: boolean;
}
