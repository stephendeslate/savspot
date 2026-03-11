import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';

@Module({
  imports: [AvailabilityModule],
  controllers: [EmbedController],
  providers: [EmbedService],
  exports: [EmbedService],
})
export class EmbedModule {}
