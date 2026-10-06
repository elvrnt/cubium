import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    // cubing loads shared chunks in workers, where DOM preload links cannot run.
    modulePreload: false,
    rollupOptions: {
      output: {
        // Keep worker dependencies separate from the React entry's DOM effects.
        manualChunks: { scramble: ['cubing/scramble'] },
      },
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        cubePreview: fileURLToPath(
          new URL('./cube-preview.html', import.meta.url),
        ),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
