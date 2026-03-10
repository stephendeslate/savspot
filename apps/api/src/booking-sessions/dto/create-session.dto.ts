import { IsOptional, IsUUID, IsEnum } from 'class-validator';
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
}
