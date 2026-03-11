import { IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaChallengeDto {
  @ApiProperty({ description: 'User ID from MFA login response' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP token' })
  @IsString()
  @Length(6, 6)
  token!: string;
}
