import { Module } from '@nestjs/common';
import { MultiLocationController } from './multi-location.controller';
import { MultiLocationService } from './multi-location.service';

@Module({
  controllers: [MultiLocationController],
  providers: [MultiLocationService],
  exports: [MultiLocationService],
})
export class MultiLocationModule {}
