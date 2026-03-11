import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckOutDto {
  @ApiPropertyOptional({ example: 'Client stayed 30 minutes extra' })
  @IsString()
  @IsOptional()
  notes?: string;
}
