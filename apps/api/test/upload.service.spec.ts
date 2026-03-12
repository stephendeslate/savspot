import { describe, it, expect, vi } from 'vitest';
import { UploadService } from '@/upload/upload.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetSignedUrl = vi.fn().mockResolvedValue('https://signed-url.example.com');

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid-1234',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const config: Record<string, string | undefined> = {
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'savspot-uploads',
    R2_PUBLIC_URL: 'https://cdn.savspot.co',
    ...overrides,
  };

  return {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UploadService', () => {
  describe('getPresignedUploadUrl', () => {
    it('should throw when R2 is not configured', async () => {
      const configService = makeConfigService({
        R2_ACCOUNT_ID: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
      });
      const service = new UploadService(configService as never);

      await expect(
        service.getPresignedUploadUrl({
          tenantId: 'tenant-001',
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow('Upload service is not configured');
    });

    it('should return uploadUrl, publicUrl, and key', async () => {
      const configService = makeConfigService();
      const service = new UploadService(configService as never);

      const result = await service.getPresignedUploadUrl({
        tenantId: 'tenant-001',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result.uploadUrl).toBe('https://signed-url.example.com');
      expect(result.key).toBe('tenants/tenant-001/fixed-uuid-1234-photo.jpg');
      expect(result.publicUrl).toBe(
        'https://cdn.savspot.co/tenants/tenant-001/fixed-uuid-1234-photo.jpg',
      );
    });

    it('should sanitize file names by removing special characters', async () => {
      const configService = makeConfigService();
      const service = new UploadService(configService as never);

      const result = await service.getPresignedUploadUrl({
        tenantId: 'tenant-001',
        fileName: 'My Photo (2).jpg',
        contentType: 'image/jpeg',
      });

      expect(result.key).toBe(
        'tenants/tenant-001/fixed-uuid-1234-my_photo__2_.jpg',
      );
    });

    it('should fall back to r2.dev URL when R2_PUBLIC_URL is empty', async () => {
      const configService = makeConfigService({ R2_PUBLIC_URL: undefined });
      const service = new UploadService(configService as never);

      const result = await service.getPresignedUploadUrl({
        tenantId: 'tenant-001',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result.publicUrl).toContain('savspot-uploads.r2.dev');
    });
  });
});
