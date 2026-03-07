import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS })],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
