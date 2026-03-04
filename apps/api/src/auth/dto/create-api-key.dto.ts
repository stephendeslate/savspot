import { IsString, IsOptional, IsDateString, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new tenant-scoped API key.
 */
export class CreateApiKeyDto {
  @ApiProperty({
    example: 'CI/CD Pipeline',
    description: 'Human-readable name for this API key',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: { bookings: 'read', services: 'read' },
    description: 'Optional JSON object defining permission scopes for this key',
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Optional expiration date (ISO 8601). Key never expires if omitted.',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
