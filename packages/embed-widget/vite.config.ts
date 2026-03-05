import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/savspot-embed.ts'),
      name: 'SavSpotEmbed',
      formats: ['iife'],
      fileName: () => 'savspot-embed.js',
    },
    outDir: 'dist',
    minify: 'terser',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
