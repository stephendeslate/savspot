import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSatisfactionDto {
  @ApiProperty({
    example: true,
    description: 'Whether the ticket resolution was helpful',
  })
  @IsBoolean()
  helpful!: boolean;
}
