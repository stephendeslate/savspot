import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_DIRECTORY } from '../bullmq/queue.constants';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { DirectoryListingService } from './directory-listing.service';
import { DirectoryProcessor } from './directory.processor';
import { SavedBusinessesController } from './saved-businesses.controller';
import { SavedBusinessesService } from './saved-businesses.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_DIRECTORY })],
  controllers: [DirectoryController, SavedBusinessesController],
  providers: [DirectoryService, DirectoryListingService, DirectoryProcessor, SavedBusinessesService],
  exports: [DirectoryService, DirectoryListingService],
})
export class DirectoryModule {}
