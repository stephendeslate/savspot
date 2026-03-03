import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Handles in-app notification creation, listing, and read-state management.
 * Provides NotificationsService for other modules to create notifications
 * when domain events occur (e.g. booking confirmed, payment received).
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
