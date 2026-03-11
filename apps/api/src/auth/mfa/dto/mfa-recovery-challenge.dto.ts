import { IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaRecoveryChallengeDto {
  @ApiProperty({ description: 'User ID from MFA login response' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'abc12def', description: '8-character recovery code' })
  @IsString()
  @Length(8, 8)
  code!: string;
}
