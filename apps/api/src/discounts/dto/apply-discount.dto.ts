import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyDiscountDto {
  @ApiProperty({
    example: 'SUMMER20',
    description: 'Discount code to validate',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
