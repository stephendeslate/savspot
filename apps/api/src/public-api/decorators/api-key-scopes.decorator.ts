import { SetMetadata } from '@nestjs/common';

export const API_KEY_SCOPES = 'api_key_scopes';
export const ApiKeyScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES, scopes);
