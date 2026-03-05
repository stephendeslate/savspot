import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNoteDto {
  @ApiProperty({
    example: 'Updated note content',
    description: 'Updated note body text',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
