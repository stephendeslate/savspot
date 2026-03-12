import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcknowledgeAlertDto {
  @ApiProperty({
    description: 'ID of the alert to acknowledge',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id!: string;
}
