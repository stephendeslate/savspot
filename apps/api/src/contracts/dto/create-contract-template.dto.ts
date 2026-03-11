import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractTemplateDto {
  @ApiProperty({
    example: 'Standard Service Agreement',
    description: 'Template name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'This agreement is entered into by...',
    description: 'Template content (HTML or Markdown)',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'Signature requirements — which roles are required and minimum count per role',
    example: { CLIENT: 1, COMPANY_REP: 1 },
  })
  @IsObject()
  @IsOptional()
  signatureRequirements?: Record<string, number>;

  @ApiPropertyOptional({
    example: 'Service',
    description: 'Template category for organization',
  })
  @IsString()
  @IsOptional()
  category?: string;
}
