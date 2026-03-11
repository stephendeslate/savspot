import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNumber,
  IsInt,
  Min,
  Max,
  Equals,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SIGNER_ROLES = ['CLIENT', 'WITNESS', 'COMPANY_REP', 'GUARDIAN', 'PARTNER', 'OTHER'] as const;
const SIGNATURE_TYPES = ['DRAWN', 'TYPED', 'UPLOADED'] as const;

export class SignContractDto {
  @ApiProperty({
    enum: SIGNER_ROLES,
    example: 'CLIENT',
    description: 'Role of the signer',
  })
  @IsEnum(SIGNER_ROLES, {
    message: `role must be one of: ${SIGNER_ROLES.join(', ')}`,
  })
  role!: (typeof SIGNER_ROLES)[number];

  @ApiProperty({
    description: 'Signature data (SVG data URI)',
  })
  @IsString()
  @IsNotEmpty()
  signatureData!: string;

  @ApiProperty({
    enum: SIGNATURE_TYPES,
    example: 'DRAWN',
    description: 'Type of signature',
  })
  @IsEnum(SIGNATURE_TYPES, {
    message: `signatureType must be one of: ${SIGNATURE_TYPES.join(', ')}`,
  })
  signatureType!: (typeof SIGNATURE_TYPES)[number];

  @ApiProperty({
    example: true,
    description: 'Must be true to acknowledge legal disclosure',
  })
  @IsBoolean()
  @Equals(true, { message: 'legalDisclosureAccepted must be true' })
  legalDisclosureAccepted!: boolean;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description: 'IP address of the signer',
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string of the signer',
  })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint data',
  })
  @IsObject()
  @IsOptional()
  deviceFingerprint?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Confidence score for the signature (0-1)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  signatureConfidence?: number;

  @ApiPropertyOptional({
    description: 'Signing order (0-based)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
