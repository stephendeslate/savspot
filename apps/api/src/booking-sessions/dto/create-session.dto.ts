import { IsOptional, IsUUID, IsEnum, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const BOOKING_SOURCES = ['DIRECT', 'DIRECTORY', 'API', 'WIDGET', 'REFERRAL', 'WALK_IN'] as const;

export class CreateSessionDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Service ID to pre-select' })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    enum: BOOKING_SOURCES,
    example: 'DIRECT',
    description: 'Booking source',
  })
  @IsEnum(BOOKING_SOURCES, {
    message: `source must be one of: ${BOOKING_SOURCES.join(', ')}`,
  })
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Create session in preview mode (no real reservations/payments)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPreview?: boolean;

  @ApiPropertyOptional({
    example: 'ABC123',
    description: 'Referral code to attribute this booking to a referral link',
  })
  @IsString()
  @IsOptional()
  referralCode?: string;
}
