import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/admin/__tests__/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    root: path.resolve(__dirname, '..'),
  },
  resolve: {
    alias: {
      '../../prisma/generated/prisma/index.js': path.resolve(
        __dirname,
        '__mocks__/prisma-generated.ts',
      ),
    },
  },
});
