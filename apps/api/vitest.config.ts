import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['{src,test}/**/*.{test,spec}.ts'],
    exclude: ['**/*.integration.spec.ts', '**/node_modules/**'],

  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '../../../../prisma/generated/prisma': path.resolve(
        __dirname,
        './test/__mocks__/prisma-generated.ts',
      ),
    },
  },
});
