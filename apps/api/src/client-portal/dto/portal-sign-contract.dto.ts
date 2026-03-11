import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortalSignContractDto {
  @ApiProperty({ description: 'Base64 signature data URI' })
  @IsString()
  signatureData!: string;

  @ApiProperty({ enum: ['DRAWN', 'TYPED', 'UPLOADED'] })
  @IsEnum(['DRAWN', 'TYPED', 'UPLOADED'])
  signatureType!: 'DRAWN' | 'TYPED' | 'UPLOADED';

  @ApiProperty({ description: 'Signer accepted legal disclosure' })
  @IsBoolean()
  legalDisclosureAccepted!: boolean;

  @ApiPropertyOptional({ description: 'IP address of signer' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
