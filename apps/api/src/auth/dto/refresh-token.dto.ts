import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
