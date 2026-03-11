import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DEVICE_TYPES = ['IOS', 'ANDROID'] as const;

export class CreateDevicePushTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Push notification token from the device',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    enum: DEVICE_TYPES,
    example: 'IOS',
    description: 'Device platform type',
  })
  @IsEnum(DEVICE_TYPES, {
    message: `deviceType must be one of: ${DEVICE_TYPES.join(', ')}`,
  })
  deviceType!: 'IOS' | 'ANDROID';

  @ApiPropertyOptional({
    example: 'iPhone 15 Pro',
    description: 'Human-readable device name',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
