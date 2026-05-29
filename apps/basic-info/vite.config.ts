import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8090';
const logProxyTarget = process.env.LOG_PROXY_TARGET ?? 'http://127.0.0.1:8091';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  server: {
    proxy: {
      '/api/basic': apiProxyTarget,
      '/api/platform': apiProxyTarget,
      '/api/logs': logProxyTarget
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/micro.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'assets/entry.js'
    }
  }
});
