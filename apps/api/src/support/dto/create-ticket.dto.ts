import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    enum: ['BUG', 'FEATURE_REQUEST', 'QUESTION', 'ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'OTHER'],
    example: 'BUG',
    description: 'Ticket category',
  })
  @IsEnum(['BUG', 'FEATURE_REQUEST', 'QUESTION', 'ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'OTHER'])
  category!: string;

  @ApiProperty({
    example: 'Cannot complete booking checkout',
    description: 'Short description of the issue',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({
    example: 'When I try to complete checkout for a haircut appointment, the page shows a spinning loader and never finishes.',
    description: 'Detailed description of the issue',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM',
    description: 'Ticket severity (defaults to MEDIUM)',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @ApiPropertyOptional({
    example: { page: '/bookings/123', error: 'timeout' },
    description: 'Contextual information about where the issue occurred',
  })
  @IsOptional()
  @IsObject()
  sourceContext?: Record<string, unknown>;
}
