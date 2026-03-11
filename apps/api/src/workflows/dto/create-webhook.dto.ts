import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsUrl,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://example.com/webhooks/savspot' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @ApiProperty({
    example: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED'],
    description: 'Array of WorkflowTriggerEvent values',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events!: string[];

  @ApiPropertyOptional({ example: 'Production webhook endpoint' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 5, default: 5, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAttempts?: number;

  @ApiPropertyOptional({ example: 10, default: 10, minimum: 5, maximum: 30 })
  @IsInt()
  @Min(5)
  @Max(30)
  @IsOptional()
  timeoutSeconds?: number;
}
