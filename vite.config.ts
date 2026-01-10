
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Standard Vite configuration for bundled React apps
export default defineConfig({
  plugins: [react()],
  base: './', // Essential for Electron production builds
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
