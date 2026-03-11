import { IsUUID, IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmbedSessionDto {
  @ApiProperty({ description: 'Service ID to book' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: 'Client email address' })
  @IsEmail()
  clientEmail!: string;

  @ApiProperty({ description: 'Client full name' })
  @IsString()
  clientName!: string;

  @ApiPropertyOptional({ description: 'Tracking source', default: 'WIDGET' })
  @IsString()
  @IsOptional()
  source?: string;
}
