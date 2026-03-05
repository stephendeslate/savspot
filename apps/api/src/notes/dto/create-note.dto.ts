import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const NOTE_ENTITY_TYPES = ['BOOKING', 'CLIENT'] as const;

export class CreateNoteDto {
  @ApiProperty({
    enum: NOTE_ENTITY_TYPES,
    example: 'BOOKING',
    description: 'Entity type the note is attached to',
  })
  @IsEnum(NOTE_ENTITY_TYPES, {
    message: `entityType must be one of: ${NOTE_ENTITY_TYPES.join(', ')}`,
  })
  entityType!: 'BOOKING' | 'CLIENT';

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the entity (booking or client)',
  })
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({
    example: 'Client prefers morning appointments',
    description: 'Note body text',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
