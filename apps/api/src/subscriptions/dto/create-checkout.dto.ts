import { IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({
    enum: ['PREMIUM', 'ENTERPRISE'],
    example: 'PREMIUM',
    description: 'Subscription tier to upgrade to',
  })
  @IsEnum(['PREMIUM', 'ENTERPRISE'], {
    message: 'tier must be either PREMIUM or ENTERPRISE',
  })
  tier!: 'PREMIUM' | 'ENTERPRISE';

  @ApiProperty({
    example: false,
    description: 'Whether to use annual billing (20% discount)',
  })
  @IsBoolean()
  isAnnual!: boolean;
}
