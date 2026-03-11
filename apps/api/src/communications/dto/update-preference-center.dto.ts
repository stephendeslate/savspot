import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenceCenterDto {
  @ApiPropertyOptional({ description: 'Opt in/out of marketing emails' })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional({ description: 'Opt in/out of booking reminders' })
  @IsOptional()
  @IsBoolean()
  bookingReminders?: boolean;

  @ApiPropertyOptional({ description: 'Opt in/out of review requests' })
  @IsOptional()
  @IsBoolean()
  reviewRequests?: boolean;

  @ApiPropertyOptional({ description: 'Opt in/out of SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Unsubscribe from all communications' })
  @IsOptional()
  @IsBoolean()
  unsubscribeAll?: boolean;
}
