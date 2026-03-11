import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDigestDto {
  @ApiProperty({
    enum: ['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY'],
    example: 'DAILY',
  })
  @IsIn(['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY'])
  frequency!: string;
}
