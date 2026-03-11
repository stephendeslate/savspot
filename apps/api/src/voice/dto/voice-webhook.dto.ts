import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TwilioAnswerDto {
  @ApiProperty({ description: 'Unique identifier for the call' })
  @IsString()
  CallSid!: string;

  @ApiProperty({ description: 'Caller phone number' })
  @IsString()
  From!: string;

  @ApiProperty({ description: 'Called phone number' })
  @IsString()
  To!: string;

  @ApiProperty({ description: 'Current call status' })
  @IsString()
  CallStatus!: string;
}

export class TwilioGatherDto {
  @ApiProperty({ description: 'Unique identifier for the call' })
  @IsString()
  CallSid!: string;

  @ApiProperty({ description: 'Transcribed speech from the caller' })
  @IsString()
  SpeechResult!: string;

  @ApiPropertyOptional({ description: 'Confidence score of transcription' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  Confidence?: number;
}

export class TwilioStatusDto {
  @ApiProperty({ description: 'Unique identifier for the call' })
  @IsString()
  CallSid!: string;

  @ApiProperty({ description: 'Final call status' })
  @IsString()
  CallStatus!: string;

  @ApiPropertyOptional({ description: 'Call duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  CallDuration?: number;
}

const VOICE_MODES = ['ai_only', 'ai_with_transfer', 'transfer_only'] as const;

export class VoiceConfigDto {
  @ApiProperty({ description: 'Voice handling mode', enum: VOICE_MODES })
  @IsIn(VOICE_MODES)
  mode!: string;

  @ApiProperty({ description: 'Greeting message for callers' })
  @IsString()
  greeting!: string;

  @ApiPropertyOptional({ description: 'After-hours greeting message' })
  @IsOptional()
  @IsString()
  afterHoursGreeting?: string;

  @ApiPropertyOptional({ description: 'Phone number for call transfers' })
  @IsOptional()
  @IsString()
  transferNumber?: string;

  @ApiPropertyOptional({ description: 'Transfer timeout in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  transferTimeoutSeconds?: number;
}

export class UpdateVoiceConfigDto {
  @ApiPropertyOptional({ description: 'Voice handling mode', enum: VOICE_MODES })
  @IsOptional()
  @IsIn(VOICE_MODES)
  mode?: string;

  @ApiPropertyOptional({ description: 'Greeting message for callers' })
  @IsOptional()
  @IsString()
  greeting?: string;

  @ApiPropertyOptional({ description: 'After-hours greeting message' })
  @IsOptional()
  @IsString()
  afterHoursGreeting?: string;

  @ApiPropertyOptional({ description: 'Phone number for call transfers' })
  @IsOptional()
  @IsString()
  transferNumber?: string;

  @ApiPropertyOptional({ description: 'Transfer timeout in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  transferTimeoutSeconds?: number;

  @ApiPropertyOptional({ description: 'Whether voice receptionist is enabled' })
  @IsOptional()
  @IsBoolean()
  voiceEnabled?: boolean;
}

export class ListCallLogsDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (default: 20)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
