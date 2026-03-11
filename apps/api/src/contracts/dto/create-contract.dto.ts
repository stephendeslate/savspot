import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Contract template ID',
  })
  @IsUUID()
  templateId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Booking ID to associate with this contract',
  })
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional({
    description: 'Quote ID to link to the contract',
  })
  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({
    description: 'Contract content (if not provided, copied from template)',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Expiry date for the contract (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
