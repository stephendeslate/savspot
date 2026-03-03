import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectAccountDto {
  @ApiPropertyOptional({
    example: 'US',
    description: 'ISO 3166-1 alpha-2 country code (default: US)',
  })
  @IsString()
  @IsOptional()
  country?: string = 'US';
}
