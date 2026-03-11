import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaTokenDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP token' })
  @IsString()
  @Length(6, 6)
  token!: string;
}
