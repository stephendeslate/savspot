import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
} from './queue.constants';

/**
 * Global BullMQ module that registers all job queues.
 * Uses the existing Redis connection from REDIS_URL.
 * Queue architecture per SRS-3 §18.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
          defaultJobOptions: {
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 },
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_BOOKINGS },
      { name: QUEUE_PAYMENTS },
      { name: QUEUE_CALENDAR },
      { name: QUEUE_COMMUNICATIONS },
      { name: QUEUE_INVOICES },
      { name: QUEUE_GDPR },
    ),
  ],
  exports: [BullModule],
})
export class BullMqModule {}
