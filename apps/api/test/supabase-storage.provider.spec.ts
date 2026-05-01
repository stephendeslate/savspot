import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageProvider } from '@/upload/supabase-storage.provider';

const mockCreateSignedUploadUrl = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUploadUrl: (...args: unknown[]) =>
          mockCreateSignedUploadUrl(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  })),
}));

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid-1234',
}));

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const config: Record<string, string | undefined> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_STORAGE_BUCKET: 'savspot-uploads',
    ...overrides,
  };

  return {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
}

describe('SupabaseStorageProvider', () => {
  beforeEach(() => {
    mockCreateSignedUploadUrl.mockReset();
    mockGetPublicUrl.mockReset();
  });

  describe('getPresignedUploadUrl', () => {
    it('throws when Supabase is not configured', async () => {
      const configService = makeConfigService({
        SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      });
      const provider = new SupabaseStorageProvider(configService as never);

      await expect(
        provider.getPresignedUploadUrl({
          tenantId: 'tenant-001',
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow('Upload service is not configured');
    });

    it('returns uploadUrl, publicUrl, and key on success', async () => {
      mockCreateSignedUploadUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://example.supabase.co/storage/v1/object/upload/signed/abc', path: 'foo', token: 'bar' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: {
          publicUrl:
            'https://example.supabase.co/storage/v1/object/public/savspot-uploads/tenants/tenant-001/fixed-uuid-1234-photo.jpg',
        },
      });

      const provider = new SupabaseStorageProvider(makeConfigService() as never);
      const result = await provider.getPresignedUploadUrl({
        tenantId: 'tenant-001',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result.uploadUrl).toBe(
        'https://example.supabase.co/storage/v1/object/upload/signed/abc',
      );
      expect(result.key).toBe('tenants/tenant-001/fixed-uuid-1234-photo.jpg');
      expect(result.publicUrl).toContain('savspot-uploads/tenants/tenant-001');
    });

    it('sanitizes file names', async () => {
      mockCreateSignedUploadUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://signed', path: 'foo', token: 'bar' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://public' } });

      const provider = new SupabaseStorageProvider(makeConfigService() as never);
      const result = await provider.getPresignedUploadUrl({
        tenantId: 'tenant-001',
        fileName: 'My Photo (2).jpg',
        contentType: 'image/jpeg',
      });

      expect(result.key).toBe(
        'tenants/tenant-001/fixed-uuid-1234-my_photo__2_.jpg',
      );
    });

    it('surfaces Supabase storage errors', async () => {
      mockCreateSignedUploadUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'bucket not found' },
      });

      const provider = new SupabaseStorageProvider(makeConfigService() as never);

      await expect(
        provider.getPresignedUploadUrl({
          tenantId: 'tenant-001',
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow(/bucket not found/);
    });
  });
});
