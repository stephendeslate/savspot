import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConsentDto {
  @ApiProperty({
    example: true,
    description: 'Whether the user consents to this purpose',
  })
  @IsBoolean()
  consented!: boolean;
}
