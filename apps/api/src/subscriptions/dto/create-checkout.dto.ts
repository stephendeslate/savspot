import { IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({
    enum: ['PRO'],
    example: 'PRO',
    description: 'Subscription tier to upgrade to',
  })
  @IsEnum(['PRO'], {
    message: 'tier must be PRO',
  })
  tier!: 'PRO';

  @ApiProperty({
    example: false,
    description: 'Whether to use annual billing (20% discount)',
  })
  @IsBoolean()
  isAnnual!: boolean;
}
