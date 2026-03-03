import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { CommunicationsService } from './communications.service';
import { CommunicationsProcessor } from './communications.processor';

/**
 * CommunicationsModule — handles all outbound communications (email, SMS, push).
 * Registers the 'communications' BullMQ queue, the template-rendering service,
 * and the async processor that delivers via Resend.
 *
 * PrismaModule and BullMqModule are global, so they are available without
 * explicit import. ConfigModule is also global.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  providers: [CommunicationsService, CommunicationsProcessor],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
