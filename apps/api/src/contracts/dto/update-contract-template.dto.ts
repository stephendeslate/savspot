import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContractTemplateDto {
  @ApiPropertyOptional({
    example: 'Updated Service Agreement',
    description: 'Template name',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Template content (HTML or Markdown)',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Signature requirements — which roles are required and minimum count per role',
    example: { CLIENT: 1, COMPANY_REP: 1 },
  })
  @IsObject()
  @IsOptional()
  signatureRequirements?: Record<string, number>;

  @ApiPropertyOptional({
    example: 'Service',
    description: 'Template category',
  })
  @IsString()
  @IsOptional()
  category?: string;
}
