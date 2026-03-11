import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Booking Confirmation' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Your booking is confirmed' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: '<p>Hi {{client.name}}, your booking is confirmed.</p>' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiProperty({ enum: ['EMAIL', 'SMS', 'IN_APP'], example: 'EMAIL' })
  @IsIn(['EMAIL', 'SMS', 'IN_APP'])
  channel!: string;

  @ApiPropertyOptional({ example: 'booking.confirmed' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  layoutId?: string;
}
