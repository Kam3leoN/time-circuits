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
      includeAssets: ['icons/*.png', 'fonts/*.woff2', 'bg/*.webp', 'audios/*.mp3'],
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
        globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg,mp3}'],
        // La musique du film (≈3,3 Mo) est mise en cache pour fonctionner hors ligne.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
