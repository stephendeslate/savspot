import { IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTemplatesDto {
  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'IN_APP'] })
  @IsIn(['EMAIL', 'SMS', 'IN_APP'])
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (default: 20)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
