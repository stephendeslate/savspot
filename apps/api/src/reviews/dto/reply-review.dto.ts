import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyReviewDto {
  @ApiProperty({
    example: 'Thank you for your feedback! We appreciate your kind words.',
    description: 'Business owner reply text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  response!: string;
}
