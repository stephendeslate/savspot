import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] || '3001', 10),
  databaseUrl: process.env['DATABASE_URL'],
  redisUrl: process.env['REDIS_URL'],
  nodeEnv: process.env['NODE_ENV'] || 'development',
  webUrl: process.env['WEB_URL'] || 'http://localhost:3000',
}));

export const jwtConfig = registerAs('jwt', () => ({
  privateKeyBase64: process.env['JWT_PRIVATE_KEY_BASE64'],
  publicKeyBase64: process.env['JWT_PUBLIC_KEY_BASE64'],
  accessExpiry: process.env['JWT_ACCESS_EXPIRY'] || '15m',
  refreshExpiry: process.env['JWT_REFRESH_EXPIRY'] || '7d',
}));

export const googleConfig = registerAs('google', () => ({
  clientId: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackUrl:
    process.env['GOOGLE_CALLBACK_URL'] ||
    'http://localhost:3001/api/auth/google/callback',
}));

export const resendConfig = registerAs('resend', () => ({
  apiKey: process.env['RESEND_API_KEY'],
  fromEmail: process.env['RESEND_FROM_EMAIL'] || 'onboarding@savspot.co',
}));

export const r2Config = registerAs('r2', () => ({
  accountId: process.env['R2_ACCOUNT_ID'],
  accessKeyId: process.env['R2_ACCESS_KEY_ID'],
  secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'],
  bucketName: process.env['R2_BUCKET_NAME'] || 'savspot-uploads',
  publicUrl: process.env['R2_PUBLIC_URL'],
}));
