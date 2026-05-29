import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8090';
const dataAccessProxyTarget = process.env.DATA_ACCESS_PROXY_TARGET ?? 'http://127.0.0.1:8088';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  server: {
    proxy: {
      '/api/basic': apiProxyTarget,
      '/config': dataAccessProxyTarget,
      '/query': dataAccessProxyTarget
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
