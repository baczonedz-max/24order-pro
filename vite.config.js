import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// The dashboard (Vue) lives in ./app and is built into ./dist.
// Files in ./public (the MTV builder, TV view, demo data, images) are copied as they are.
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
});
