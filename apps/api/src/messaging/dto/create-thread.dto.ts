import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({ type: [String], description: 'Participant user IDs' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds!: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'First message content' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
