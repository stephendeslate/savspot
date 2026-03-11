import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaRecoveryDto {
  @ApiProperty({ example: 'abc12def', description: '8-character recovery code' })
  @IsString()
  @Length(8, 8)
  code!: string;
}
