import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidContractDto {
  @ApiProperty({
    example: 'Client requested cancellation',
    description: 'Reason for voiding the contract',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
