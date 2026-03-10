import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUpdateTicketDto {
  @ApiPropertyOptional({
    enum: ['NEW', 'AI_INVESTIGATING', 'AI_RESOLVED', 'NEEDS_MANUAL_REVIEW', 'RESOLVED', 'CLOSED'],
    description: 'Updated ticket status',
  })
  @IsOptional()
  @IsEnum(['NEW', 'AI_INVESTIGATING', 'AI_RESOLVED', 'NEEDS_MANUAL_REVIEW', 'RESOLVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({
    example: 'Investigated and confirmed as a known issue. Fix deployed.',
    description: 'Internal developer notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  developerNotes?: string;
}
