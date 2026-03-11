import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Notification preferences keyed by category',
    example: {
      BOOKING: { email: true, sms: false, in_app: true, push: true },
      PAYMENT: { email: true, sms: false, in_app: true, push: false },
    },
  })
  @IsObject()
  @IsOptional()
  preferences!: Record<string, { email?: boolean; sms?: boolean; in_app?: boolean; push?: boolean }>;
}
