import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDevicePushTokenDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the push token is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
