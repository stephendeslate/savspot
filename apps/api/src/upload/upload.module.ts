import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { R2StorageProvider } from './r2-storage.provider';
import { SupabaseStorageProvider } from './supabase-storage.provider';
import {
  StorageProvider,
  STORAGE_PROVIDER_TOKEN,
} from './storage-provider.interface';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    R2StorageProvider,
    SupabaseStorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        r2: R2StorageProvider,
        supabase: SupabaseStorageProvider,
      ): StorageProvider => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'r2');
        const logger = new Logger('UploadModule');
        logger.log(`Storage provider: ${provider}`);
        return provider === 'supabase' ? supabase : r2;
      },
      inject: [ConfigService, R2StorageProvider, SupabaseStorageProvider],
    },
    UploadService,
  ],
  exports: [UploadService],
})
export class UploadModule {}
