import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:4000',
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_INTERNAL_URL || 'http://backend:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.BACKEND_INTERNAL_URL || 'http://backend:4000',
        ws: true,
      },
    },
  },
});
