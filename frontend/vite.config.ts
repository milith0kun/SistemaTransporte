import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// Solo activar PWA si explícitamente se pide en entorno local o si se está seguro de no estar en Dokploy.
// Dokploy/Nixpacks tiene un bug interno con los symlinks de node_modules al ejecutar vite-plugin-pwa
const isCI = process.env.NIXPACKS || process.env.CI || process.env.DOKPLOY;

const mockPWAPlugin = () => ({
  name: 'mock-pwa-register',
  resolveId(id: string) {
    if (id === 'virtual:pwa-register') {
      return '\0virtual:pwa-register';
    }
  },
  load(id: string) {
    if (id === '\0virtual:pwa-register') {
      return 'export const registerSW = () => {};';
    }
  }
});

export default defineConfig({
  plugins: [
    react(),
    ...(!isCI ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'SFIT – Fiscalización de Transporte',
        short_name: 'SFIT',
        description: 'Sistema de Fiscalización Inteligente de Transporte',
        theme_color: '#1B4F72',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
          },
        ],
      },
    })] : [mockPWAPlugin()])
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },
});
