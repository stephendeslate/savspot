import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageProvider,
  PresignedUploadParams,
  PresignedUploadResult,
} from './storage-provider.interface';

@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  private readonly logger = new Logger(SupabaseStorageProvider.name);
  private readonly client: SupabaseClient | null;
  private readonly bucketName: string;
  private readonly projectUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.projectUrl = this.configService.get<string>('SUPABASE_URL', '');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucketName = this.configService.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'savspot-uploads',
    );

    if (this.projectUrl && serviceRoleKey) {
      this.client = createClient(this.projectUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.logger.log('Supabase Storage provider configured');
    } else {
      this.client = null;
      this.logger.warn(
        'Supabase Storage credentials not configured — upload functionality disabled',
      );
    }
  }

  async getPresignedUploadUrl(
    params: PresignedUploadParams,
  ): Promise<PresignedUploadResult> {
    if (!this.client) {
      throw new Error(
        'Upload service is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    const sanitizedFileName = params.fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const key = `tenants/${params.tenantId}/${uuidv4()}-${sanitizedFileName}`;

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUploadUrl(key);

    if (error || !data) {
      throw new Error(
        `Failed to create signed upload URL: ${error?.message ?? 'unknown error'}`,
      );
    }

    const publicUrl = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(key).data.publicUrl;

    return {
      uploadUrl: data.signedUrl,
      publicUrl,
      key,
    };
  }
}
