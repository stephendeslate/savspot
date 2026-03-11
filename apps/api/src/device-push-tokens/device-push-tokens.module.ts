import { Module } from '@nestjs/common';
import { DevicePushTokensController } from './device-push-tokens.controller';
import { DevicePushTokensService } from './device-push-tokens.service';

@Module({
  controllers: [DevicePushTokensController],
  providers: [DevicePushTokensService],
  exports: [DevicePushTokensService],
})
export class DevicePushTokensModule {}
