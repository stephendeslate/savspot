import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { DevicePushTokensService } from './device-push-tokens.service';
import { CreateDevicePushTokenDto } from './dto/create-device-push-token.dto';
import { UpdateDevicePushTokenDto } from './dto/update-device-push-token.dto';

@ApiTags('Device Push Tokens')
@ApiBearerAuth()
@Controller('device-push-tokens')
export class DevicePushTokensController {
  constructor(
    private readonly devicePushTokensService: DevicePushTokensService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a device push token' })
  @ApiResponse({ status: 201, description: 'Push token registered' })
  async register(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDevicePushTokenDto,
  ) {
    return this.devicePushTokensService.register(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device push token' })
  @ApiResponse({ status: 200, description: 'Push token updated' })
  @ApiResponse({ status: 403, description: 'Not the token owner' })
  @ApiResponse({ status: 404, description: 'Push token not found' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateDevicePushTokenDto,
  ) {
    return this.devicePushTokensService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a device push token' })
  @ApiResponse({ status: 200, description: 'Push token removed' })
  @ApiResponse({ status: 403, description: 'Not the token owner' })
  @ApiResponse({ status: 404, description: 'Push token not found' })
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.devicePushTokensService.remove(id, userId);
  }
}
