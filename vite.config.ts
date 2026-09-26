import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// `base: './'` rend le site indépendant du nom du dépôt : il fonctionne tel quel sur
// https://<utilisateur>.github.io/<depot>/ même si le dépôt est renommé.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Hayati — Ma vie en équilibre',
        short_name: 'Hayati',
        description:
          'Prières, finances, sport, hydratation, nutrition, sommeil et habitudes : toute ma vie au même endroit.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f5f2',
        theme_color: '#0e6b52',
        categories: ['lifestyle', 'health', 'finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Boire de l’eau', short_name: 'Eau', url: './#/hydratation' },
          { name: 'Mes prières', short_name: 'Prières', url: './#/din' },
          { name: 'Nouvelle dépense', short_name: 'Dépense', url: './#/finances?ajout=depense' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
