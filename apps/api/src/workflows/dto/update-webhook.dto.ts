import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'https://example.com/webhooks/savspot' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    example: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  events?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}
