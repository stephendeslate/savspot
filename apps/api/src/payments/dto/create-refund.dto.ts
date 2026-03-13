import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiPropertyOptional({
    example: 50.00,
    description: 'Refund amount in major units (dollars). Omit for full refund.',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    example: 'Cancellation requested by client',
    description: 'Reason for the refund',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
