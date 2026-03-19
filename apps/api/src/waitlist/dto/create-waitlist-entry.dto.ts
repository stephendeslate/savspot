import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, Matches } from 'class-validator';

export class CreateWaitlistEntryDto {
  @ApiPropertyOptional({ description: 'Preferred date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'Preferred time range start (HH:MM)',
    example: '09:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'preferredTimeStart must be in HH:MM format',
  })
  preferredTimeStart?: string;

  @ApiPropertyOptional({
    description: 'Preferred time range end (HH:MM)',
    example: '17:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'preferredTimeEnd must be in HH:MM format',
  })
  preferredTimeEnd?: string;
}
