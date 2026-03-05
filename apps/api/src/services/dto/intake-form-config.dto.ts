import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'SELECT',
  'MULTI_SELECT',
  'CHECKBOX',
  'NUMBER',
  'DATE',
  'EMAIL',
  'PHONE',
] as const;

export class IntakeFormFieldDto {
  @ApiProperty({ example: 'field-allergies', description: 'Unique field identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Do you have any allergies?', description: 'Field label shown to user' })
  @IsString()
  label!: string;

  @ApiProperty({
    enum: FIELD_TYPES,
    example: 'TEXT',
    description: 'Input field type',
  })
  @IsEnum(FIELD_TYPES, {
    message: `type must be one of: ${FIELD_TYPES.join(', ')}`,
  })
  type!: string;

  @ApiProperty({ example: true, description: 'Whether the field is required' })
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional({
    example: ['Option A', 'Option B'],
    description: 'Options for SELECT and MULTI_SELECT field types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({
    example: 'Enter your answer here...',
    description: 'Placeholder text for the input',
  })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({
    example: { min: 1, max: 100, pattern: '^[a-zA-Z]+$' },
    description: 'Validation rules (min, max, pattern, etc.)',
  })
  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;
}

export class IntakeFormConfigDto {
  @ApiProperty({
    type: [IntakeFormFieldDto],
    description: 'List of intake form fields',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntakeFormFieldDto)
  fields!: IntakeFormFieldDto[];
}
