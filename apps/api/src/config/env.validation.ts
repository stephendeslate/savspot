import { z } from 'zod';

export const envSchema = z.object({
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
