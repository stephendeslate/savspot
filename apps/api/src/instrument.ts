import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['NODE_ENV'] || 'development',
  enabled: !!process.env['SENTRY_DSN'],
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
});
