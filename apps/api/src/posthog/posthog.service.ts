import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class PosthogService implements OnModuleDestroy {
  private readonly logger = new Logger(PosthogService.name);
  private client: PostHog | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host: this.configService.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com',
      });
      this.logger.log('PostHog analytics initialized');
    } else {
      this.logger.warn('PostHog API key not configured — analytics disabled');
    }
  }

  capture(event: string, distinctId: string, properties?: Record<string, unknown>) {
    this.client?.capture({ event, distinctId, properties });
  }

  identify(distinctId: string, properties?: Record<string, unknown>) {
    this.client?.identify({ distinctId, properties });
  }

  groupIdentify(groupType: string, groupKey: string, properties?: Record<string, unknown>) {
    this.client?.groupIdentify({ groupType, groupKey, properties });
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }
}
