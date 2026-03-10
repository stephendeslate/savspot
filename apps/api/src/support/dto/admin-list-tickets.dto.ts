import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminListTicketsDto {
  @ApiPropertyOptional({
    enum: ['NEW', 'AI_INVESTIGATING', 'AI_RESOLVED', 'NEEDS_MANUAL_REVIEW', 'RESOLVED', 'CLOSED'],
    description: 'Filter by ticket status',
  })
  @IsOptional()
  @IsEnum(['NEW', 'AI_INVESTIGATING', 'AI_RESOLVED', 'NEEDS_MANUAL_REVIEW', 'RESOLVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    description: 'Filter by ticket severity',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;
}
