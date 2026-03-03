import { z } from 'zod';

export const envSchema = z.object({
  // ---- Core ----
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/savspot_dev'),

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
