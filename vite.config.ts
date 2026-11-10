import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: { host: true, port: 5175, strictPort: true },
  preview: { host: true, port: 5175, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'fonts/*.woff2', 'assets/bg/*.webp', 'assets/ui/*.png', 'audios/*.mp3'],
      manifest: {
        name: 'Time Circuits',
        short_name: 'Time Circuits',
        description: 'Les time circuits de la DeLorean : réglez une date et voyagez à 88 mph.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#0b0c0e',
        theme_color: '#0b0c0e',
        categories: ['entertainment', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pré-cache : l'app, les polices, les fonds WebP, la bande des boutons, les bruitages.
        globPatterns: ['**/*.{js,css,html,woff2,webp,svg}', 'icons/*.png', 'assets/ui/*.png', 'audios/*.mp3'],
        globIgnores: ['audios/bttf.mp3'],
        // Gros fichiers (musique 3,3 Mo, éclairs 6,4 Mo, fonds PNG) : mis en cache au premier usage, puis hors ligne.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(assets\/(fx|bg)\/|audios\/bttf\.mp3)/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'time-circuits-media',
              expiration: { maxEntries: 20 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
});
