import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateQuoteLineItemDto } from './create-quote-line-item.dto';

export class CreateQuoteDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Booking ID to associate with this quote',
  })
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Additional notes for the quote' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-04-01T00:00:00Z',
    description: 'Quote expiration date',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Currency code (default: USD)',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Line items to create with the quote',
    type: [CreateQuoteLineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  @IsOptional()
  lineItems?: CreateQuoteLineItemDto[];
}
