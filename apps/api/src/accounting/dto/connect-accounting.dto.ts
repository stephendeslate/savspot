import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ACCOUNTING_PROVIDERS = ['QUICKBOOKS', 'XERO'] as const;

export class ConnectAccountingDto {
  @ApiProperty({
    enum: ACCOUNTING_PROVIDERS,
    description: 'Accounting provider to connect',
    example: 'QUICKBOOKS',
  })
  @IsEnum(ACCOUNTING_PROVIDERS, {
    message: `provider must be one of: ${ACCOUNTING_PROVIDERS.join(', ')}`,
  })
  provider!: (typeof ACCOUNTING_PROVIDERS)[number];
}
