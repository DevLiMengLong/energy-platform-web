import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  server: {
    proxy: {
      '/api/basic': 'http://127.0.0.1:8090',
      '/api/platform': 'http://127.0.0.1:8090',
      '/api/logs': 'http://127.0.0.1:8091'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
