export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface PresignedUploadParams {
  tenantId: string;
  fileName: string;
  contentType: string;
}

export interface StorageProvider {
  getPresignedUploadUrl(params: PresignedUploadParams): Promise<PresignedUploadResult>;
}

export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER';
