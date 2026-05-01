import { Module } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { DirectoryListingService } from './directory-listing.service';
import { SavedBusinessesController } from './saved-businesses.controller';
import { SavedBusinessesService } from './saved-businesses.service';

@Module({
  controllers: [DirectoryController, SavedBusinessesController],
  providers: [DirectoryService, DirectoryListingService, SavedBusinessesService],
  exports: [DirectoryService, DirectoryListingService],
})
export class DirectoryModule {}
