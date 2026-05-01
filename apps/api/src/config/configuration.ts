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

export const supabaseConfig = registerAs('supabase', () => ({
  url: process.env['SUPABASE_URL'],
  serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'],
  storageBucket: process.env['SUPABASE_STORAGE_BUCKET'] || 'savspot-uploads',
}));

export const storageConfig = registerAs('storage', () => ({
  provider: process.env['STORAGE_PROVIDER'] || 'r2',
}));

export const inngestConfig = registerAs('inngest', () => ({
  eventKey: process.env['INNGEST_EVENT_KEY'],
  signingKey: process.env['INNGEST_SIGNING_KEY'],
}));

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env['STRIPE_SECRET_KEY'],
  publishableKey: process.env['STRIPE_PUBLISHABLE_KEY'],
  webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'],
  connectWebhookSecret: process.env['STRIPE_CONNECT_WEBHOOK_SECRET'],
  platformFeePercent: parseFloat(process.env['STRIPE_PLATFORM_FEE_PERCENT'] || '1'),
}));

export const smsConfig = registerAs('sms', () => ({
  provider: process.env['SMS_PROVIDER'] || 'twilio',
}));

export const twilioConfig = registerAs('twilio', () => ({
  accountSid: process.env['TWILIO_ACCOUNT_SID'],
  authToken: process.env['TWILIO_AUTH_TOKEN'],
  phoneNumber: process.env['TWILIO_PHONE_NUMBER'],
}));

export const plivoConfig = registerAs('plivo', () => ({
  authId: process.env['PLIVO_AUTH_ID'],
  authToken: process.env['PLIVO_AUTH_TOKEN'],
  fromNumber: process.env['PLIVO_FROM_NUMBER'],
}));

export const googleCalendarConfig = registerAs('googleCalendar', () => ({
  clientId: process.env['GOOGLE_CALENDAR_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CALENDAR_CLIENT_SECRET'],
  redirectUri:
    process.env['GOOGLE_CALENDAR_REDIRECT_URI'] ||
    'http://localhost:3001/api/auth/google-calendar/callback',
  webhookUrl: process.env['GOOGLE_CALENDAR_WEBHOOK_URL'],
}));

export const microsoftCalendarConfig = registerAs('microsoftCalendar', () => ({
  clientId: process.env['MICROSOFT_CLIENT_ID'],
  clientSecret: process.env['MICROSOFT_CLIENT_SECRET'],
  redirectUri:
    process.env['MICROSOFT_REDIRECT_URI'] ||
    'http://localhost:3001/api/auth/outlook-calendar/callback',
}));

export const posthogConfig = registerAs('posthog', () => ({
  apiKey: process.env['POSTHOG_API_KEY'],
  host: process.env['POSTHOG_HOST'] || 'https://us.i.posthog.com',
}));

export const vapidConfig = registerAs('vapid', () => ({
  publicKey: process.env['VAPID_PUBLIC_KEY'],
  privateKey: process.env['VAPID_PRIVATE_KEY'],
  subject: process.env['VAPID_SUBJECT'] || 'mailto:support@savspot.co',
}));
