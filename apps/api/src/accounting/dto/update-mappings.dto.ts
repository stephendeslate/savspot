import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AccountingMappingItemDto {
  @ApiProperty({
    description: 'Local service category name',
    example: 'Haircut',
  })
  @IsString()
  localCategory!: string;

  @ApiProperty({
    description: 'External account ID in the accounting provider',
    example: '1234',
  })
  @IsString()
  externalAccountId!: string;
}

export class UpdateMappingsDto {
  @ApiProperty({
    type: [AccountingMappingItemDto],
    description: 'Array of category-to-account mappings',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountingMappingItemDto)
  mappings!: AccountingMappingItemDto[];
}
