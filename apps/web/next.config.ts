import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@savspot/shared', '@savspot/ui'],
};

export default nextConfig;
