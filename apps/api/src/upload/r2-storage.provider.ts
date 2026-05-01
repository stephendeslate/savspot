import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageProvider,
  PresignedUploadParams,
  PresignedUploadResult,
} from './storage-provider.interface';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'savspot-uploads',
    );
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('R2 storage provider configured');
    } else {
      this.s3Client = null;
      this.logger.warn(
        'R2 credentials not configured — upload functionality disabled',
      );
    }
  }

  async getPresignedUploadUrl(
    params: PresignedUploadParams,
  ): Promise<PresignedUploadResult> {
    if (!this.s3Client) {
      throw new Error(
        'Upload service is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
      );
    }

    const sanitizedFileName = params.fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();

    const key = `tenants/${params.tenantId}/${uuidv4()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 600,
    });

    const publicUrl = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucketName}.r2.dev/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
