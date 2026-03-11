import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSseController } from './notification-sse.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  controllers: [
    NotificationsController,
    NotificationSseController,
    NotificationPreferencesController,
  ],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationSseController,
  ],
  exports: [NotificationsService, NotificationPreferencesService, NotificationSseController],
})
export class NotificationsModule {}
