import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Updated Booking Confirmation' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Your booking is confirmed' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: '<p>Hi {{client.name}}, your booking is confirmed.</p>' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'IN_APP'] })
  @IsIn(['EMAIL', 'SMS', 'IN_APP'])
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ example: 'booking.confirmed' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  layoutId?: string;

  @ApiPropertyOptional({ description: 'Reason for the change (stored in version history)' })
  @IsString()
  @IsOptional()
  changeReason?: string;
}
