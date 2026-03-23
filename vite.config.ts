import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Proxy API requests to FastAPI server
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // PWA configuration
  build: {
    rollupOptions: {
      // Ensure service worker is copied to dist
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  // Public directory for static assets
  publicDir: 'public',
})

