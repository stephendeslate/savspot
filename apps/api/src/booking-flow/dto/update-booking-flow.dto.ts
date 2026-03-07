import { IsOptional, IsNumber, Min, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingFlowDto {
  @ApiPropertyOptional({ description: 'Step override configuration (JSON)' })
  @IsObject()
  @IsOptional()
  stepOverrides?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'General settings (JSON)' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minBookingAdvanceDays?: number;

  @ApiPropertyOptional({ example: 365 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxBookingAdvanceDays?: number;
}
