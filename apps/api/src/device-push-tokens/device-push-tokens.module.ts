import { Module } from '@nestjs/common';
import { DevicePushTokensController } from './device-push-tokens.controller';
import { DevicePushTokensService } from './device-push-tokens.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  controllers: [DevicePushTokensController],
  providers: [DevicePushTokensService, ExpoPushService],
  exports: [DevicePushTokensService, ExpoPushService],
})
export class DevicePushTokensModule {}
