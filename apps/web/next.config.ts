import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@savspot/shared', '@savspot/ui'],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT'],
  silent: !process.env['CI'],
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: '/monitoring',
});
