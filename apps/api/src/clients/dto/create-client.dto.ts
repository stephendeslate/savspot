import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Client full name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: 'Client email address',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Client phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: ['vip'],
    description: 'Client tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: 'Referred by John',
    description: 'Notes about the client',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
