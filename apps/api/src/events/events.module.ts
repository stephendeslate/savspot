import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';

/**
 * Global event bus module using @nestjs/event-emitter.
 * Provides typed event publishing via EventsService.
 * Consumers use @OnEvent() decorator to listen for domain events.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
