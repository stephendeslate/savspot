import { Inject, Injectable } from '@nestjs/common';
import {
  PresignedUploadParams,
  PresignedUploadResult,
  StorageProvider,
  STORAGE_PROVIDER_TOKEN,
} from './storage-provider.interface';

export type { PresignedUploadResult } from './storage-provider.interface';

@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: StorageProvider,
  ) {}

  getPresignedUploadUrl(
    params: PresignedUploadParams,
  ): Promise<PresignedUploadResult> {
    return this.storageProvider.getPresignedUploadUrl(params);
  }
}
