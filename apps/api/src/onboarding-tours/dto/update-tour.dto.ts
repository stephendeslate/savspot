import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ACTIONS = ['complete', 'dismiss'] as const;

export class UpdateTourDto {
  @ApiProperty({
    enum: ACTIONS,
    example: 'complete',
    description: 'Action to perform on the tour',
  })
  @IsEnum(ACTIONS, {
    message: 'action must be either "complete" or "dismiss"',
  })
  action!: 'complete' | 'dismiss';
}
