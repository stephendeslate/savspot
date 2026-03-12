import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_IMPORTS } from '../bullmq/queue.constants';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsProcessor } from './imports.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_IMPORTS }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
