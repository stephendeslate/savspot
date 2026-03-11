import { Module } from '@nestjs/common';
import { V1Module } from './v1/v1.module';
import { PublicApiKeyService } from './services/api-key.service';

@Module({
  imports: [V1Module],
  providers: [PublicApiKeyService],
  exports: [PublicApiKeyService],
})
export class PublicApiModule {}
