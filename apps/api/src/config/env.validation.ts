import { z } from 'zod';

export const envSchema = z.object({
  // ---- Core ----
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://savspot:savspot_dev@localhost:5432/savspot_dev'),

  REDIS_URL: z
    .string()
    .url()
    .default('redis://localhost:6379'),

  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('3001'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  WEB_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),

  // ---- JWT (RS256 key pair, base64-encoded) ----
  JWT_PRIVATE_KEY_BASE64: z
    .string()
    .optional(),

  JWT_PUBLIC_KEY_BASE64: z
    .string()
    .optional(),

  JWT_ACCESS_EXPIRY: z
    .string()
    .default('15m'),

  JWT_REFRESH_EXPIRY: z
    .string()
    .default('7d'),

  // ---- Google OAuth ----
  GOOGLE_CLIENT_ID: z
    .string()
    .optional(),

  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional(),

  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:3001/api/auth/google/callback'),

  // ---- Resend (transactional email) ----
  RESEND_API_KEY: z
    .string()
    .optional(),

  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .default('onboarding@savspot.co'),

  // ---- Cloudflare R2 (file uploads) ----
  R2_ACCOUNT_ID: z
    .string()
    .optional(),

  R2_ACCESS_KEY_ID: z
    .string()
    .optional(),

  R2_SECRET_ACCESS_KEY: z
    .string()
    .optional(),

  R2_BUCKET_NAME: z
    .string()
    .default('savspot-uploads'),

  R2_PUBLIC_URL: z
    .string()
    .optional(),

  // ---- Stripe (payments) ----
  STRIPE_SECRET_KEY: z
    .string()
    .optional(),

  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional(),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional(),

  STRIPE_CONNECT_WEBHOOK_SECRET: z
    .string()
    .optional(),

  STRIPE_PLATFORM_FEE_PERCENT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('1'),

  // ---- SMS Provider ----
  SMS_PROVIDER: z
    .enum(['twilio', 'plivo'])
    .optional()
    .default('twilio'),

  // ---- Twilio (SMS) ----
  TWILIO_ACCOUNT_SID: z
    .string()
    .optional(),

  TWILIO_AUTH_TOKEN: z
    .string()
    .optional(),

  TWILIO_PHONE_NUMBER: z
    .string()
    .optional(),

  // ---- Plivo (SMS) ----
  PLIVO_AUTH_ID: z
    .string()
    .optional(),

  PLIVO_AUTH_TOKEN: z
    .string()
    .optional(),

  PLIVO_FROM_NUMBER: z
    .string()
    .optional(),

  // ---- Google Calendar OAuth ----
  GOOGLE_CALENDAR_CLIENT_ID: z
    .string()
    .optional(),

  GOOGLE_CALENDAR_CLIENT_SECRET: z
    .string()
    .optional(),

  GOOGLE_CALENDAR_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3001/api/auth/google-calendar/callback'),

  GOOGLE_CALENDAR_WEBHOOK_URL: z
    .string()
    .optional(),

  // ---- Microsoft / Outlook Calendar OAuth ----
  MICROSOFT_CLIENT_ID: z
    .string()
    .optional(),

  MICROSOFT_CLIENT_SECRET: z
    .string()
    .optional(),

  MICROSOFT_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3001/api/auth/outlook-calendar/callback'),

  // ---- Sentry (Error Tracking) ----
  SENTRY_DSN: z
    .string()
    .url()
    .optional(),

  // ---- VAPID (Browser Push) ----
  VAPID_PUBLIC_KEY: z
    .string()
    .optional(),

  VAPID_PRIVATE_KEY: z
    .string()
    .optional(),

  VAPID_SUBJECT: z
    .string()
    .default('mailto:support@savspot.co'),

  // ---- Ollama (AI Support Triage) ----
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen3-coder-next'),

  // ---- Apple Sign-In ----
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY_PATH: z.string().optional(),
  APPLE_CALLBACK_URL: z.string().url().optional(),

  // ---- Encryption ----
  ENCRYPTION_KEY: z.string().optional(),

  // ---- MFA ----
  MFA_ENCRYPTION_KEY: z.string().optional(),

  // ---- Webhook Encryption ----
  WEBHOOK_ENCRYPTION_KEY: z.string().optional(),

  // ---- PostHog (Product Analytics) ----
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional().default('https://us.i.posthog.com'),

  // ---- AI Triage ----
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),

  // ---- Enterprise Edition ----
  SAVSPOT_LICENSE_KEY: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    const required: Array<{ key: keyof typeof data; label: string }> = [
      { key: 'JWT_PRIVATE_KEY_BASE64', label: 'JWT_PRIVATE_KEY_BASE64' },
      { key: 'JWT_PUBLIC_KEY_BASE64', label: 'JWT_PUBLIC_KEY_BASE64' },
      { key: 'ENCRYPTION_KEY', label: 'ENCRYPTION_KEY' },
      { key: 'MFA_ENCRYPTION_KEY', label: 'MFA_ENCRYPTION_KEY' },
      { key: 'WEBHOOK_ENCRYPTION_KEY', label: 'WEBHOOK_ENCRYPTION_KEY' },
      { key: 'STRIPE_SECRET_KEY', label: 'STRIPE_SECRET_KEY' },
      { key: 'STRIPE_WEBHOOK_SECRET', label: 'STRIPE_WEBHOOK_SECRET' },
      { key: 'RESEND_API_KEY', label: 'RESEND_API_KEY' },
    ];

    for (const { key, label } of required) {
      if (!data[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [label],
          message: `${label} is required in production`,
        });
      }
    }
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(
      `Environment validation failed:\n${JSON.stringify(errors, null, 2)}`,
    );
  }

  return result.data;
}
