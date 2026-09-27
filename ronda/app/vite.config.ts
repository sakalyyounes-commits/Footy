import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// `base: './'` : chemins relatifs, indispensables dans l'application Capacitor
// (les fichiers sont servis depuis https://localhost ou capacitor://localhost).
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Dans l'application native, pas de service worker : Capacitor sert déjà les fichiers.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: './',
        name: 'Ronda Dyalna — Jeu de cartes marocain',
        short_name: 'Ronda',
        description: 'La Ronda marocaine en ligne : 1 contre 1, 2 contre 2, entre amis ou contre l’ordinateur.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#062b21',
        theme_color: '#062b21',
        categories: ['games', 'card'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallbackDenylist: [/^\/ws/, /^\/api\//, /^\/join\//, /^\/webhooks\//],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    target: ['es2020', 'safari15', 'chrome90'],
    chunkSizeWarningLimit: 900,
  },
  worker: {
    format: 'es',
  },
});
