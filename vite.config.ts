import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/')) return 'firebase';
          if (id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/react/')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
