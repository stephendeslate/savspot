import { IsNumber, IsString, Length, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertCurrencyDto {
  @ApiProperty({ example: 100, description: 'Amount to convert' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'USD', description: 'Source currency (ISO 4217)' })
  @IsString()
  @Length(3, 3)
  from!: string;

  @ApiProperty({ example: 'EUR', description: 'Target currency (ISO 4217)' })
  @IsString()
  @Length(3, 3)
  to!: string;
}
