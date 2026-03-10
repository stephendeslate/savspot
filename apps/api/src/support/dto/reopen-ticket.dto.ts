import {
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReopenTicketDto {
  @ApiPropertyOptional({
    example: 'The issue is still occurring after the suggested fix.',
    description: 'Optional reason for reopening the ticket',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
