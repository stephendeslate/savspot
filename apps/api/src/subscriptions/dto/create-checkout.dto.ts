import { IsEnum, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({
    enum: ['STARTER', 'TEAM'],
    example: 'STARTER',
    description: 'Subscription tier to upgrade to',
  })
  @IsEnum(['STARTER', 'TEAM'], {
    message: 'tier must be STARTER or TEAM',
  })
  tier!: 'STARTER' | 'TEAM';

  @ApiProperty({
    example: false,
    description: 'Whether to use annual billing (discount)',
  })
  @IsBoolean()
  isAnnual!: boolean;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of seats (required for TEAM tier, 2-10)',
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  seatCount?: number;
}
