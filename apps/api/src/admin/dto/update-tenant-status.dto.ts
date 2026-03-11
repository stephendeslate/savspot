import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TENANT_STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export class UpdateTenantStatusDto {
  @ApiProperty({
    enum: TENANT_STATUS_OPTIONS,
    example: 'SUSPENDED',
    description: 'New tenant status',
  })
  @IsEnum(TENANT_STATUS_OPTIONS, {
    message: `status must be one of: ${TENANT_STATUS_OPTIONS.join(', ')}`,
  })
  status!: (typeof TENANT_STATUS_OPTIONS)[number];
}
