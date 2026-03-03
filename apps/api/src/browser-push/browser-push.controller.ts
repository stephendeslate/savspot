import {
  Controller,
  Post,
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
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { BrowserPushService, PushSubscriptionInput } from './browser-push.service';

class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;
}

class RegisterPushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;
}

@ApiTags('Browser Push')
@ApiBearerAuth()
@Controller('users/me/push-subscriptions')
export class BrowserPushController {
  constructor(
    private readonly browserPushService: BrowserPushService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a browser push subscription' })
  @ApiResponse({ status: 201, description: 'Push subscription registered' })
  async subscribe(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterPushSubscriptionDto,
  ) {
    const subscription: PushSubscriptionInput = {
      endpoint: dto.endpoint,
      keys: {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    };

    return this.browserPushService.subscribe(
      userId,
      dto.tenantId,
      subscription,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a browser push subscription' })
  @ApiResponse({ status: 200, description: 'Push subscription removed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async unsubscribe(
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.browserPushService.unsubscribe(id);
    return { message: 'Push subscription removed' };
  }
}
