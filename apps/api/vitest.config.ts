import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['{src,test}/**/*.{test,spec}.ts'],
    exclude: ['**/*.integration.spec.ts', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.module.ts', '**/index.ts', '**/main.ts'],
      thresholds: {
        statements: 70,
        branches: 50,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '../../../../prisma/generated/prisma/runtime/library': path.resolve(
        __dirname,
        './test/__mocks__/prisma-runtime.ts',
      ),
      '../../../../prisma/generated/prisma': path.resolve(
        __dirname,
        './test/__mocks__/prisma-generated.ts',
      ),
    },
  },
});
