import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    open: true,
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io'],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pdf-vendor': ['pdf-lib'],
          'db-vendor': ['dexie'],
          'ocr-vendor': ['tesseract.js'],
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // Temporarily enabled for debugging
        drop_debugger: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      // Re-habilitado: el problema era que Firebase no estaba excluido del caché.
      // Ahora el SW personalizado (src/sw.ts) usa NetworkOnly para TODOS los endpoints de Firebase + Google.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB (OCR/PDF)
      },
      includeAssets: ['favicon.ico', 'icon-192x192.svg', 'vite.svg'],
      manifest: {
        name: 'CROSSLOG - Sistema de Entregas',
        short_name: 'CROSSLOG',
        description: 'Sistema de gestión de entregas logísticas con captura de fotos, firma digital y sincronización offline',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})
