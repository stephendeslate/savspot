import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientDto {
  @ApiPropertyOptional({
    example: ['vip', 'returning'],
    description: 'Client tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: 'Prefers morning appointments',
    description: 'Client-visible notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: 'Tends to cancel last minute',
    description: 'Internal staff notes (not visible to client)',
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;
}
