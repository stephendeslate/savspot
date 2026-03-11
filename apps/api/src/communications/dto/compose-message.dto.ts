import { IsString, IsEnum, IsOptional, IsEmail, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ComposeChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export class ComposeMessageDto {
  @ApiProperty({ enum: ComposeChannel })
  @IsEnum(ComposeChannel)
  channel!: ComposeChannel;

  @ApiPropertyOptional({ description: 'Recipient user ID to send to' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Recipient email (if not using recipientId)' })
  @ValidateIf((o: ComposeMessageDto) => o.channel === ComposeChannel.EMAIL && !o.recipientId)
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Recipient phone (if not using recipientId)' })
  @ValidateIf((o: ComposeMessageDto) => o.channel === ComposeChannel.SMS && !o.recipientId)
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({ description: 'Message subject (email only)' })
  @ValidateIf((o: ComposeMessageDto) => o.channel === ComposeChannel.EMAIL)
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: 'Template key to use for rendering' })
  @IsOptional()
  @IsString()
  templateKey?: string;
}
