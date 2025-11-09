import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Debug: Log environment variables during build
console.log('=== VITE BUILD - Environment Variables ===');
console.log('VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓ Set' : '✗ Not set');
console.log('VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '✓ Set' : '✗ Not set');
console.log('VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL value:', process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY starts:', process.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 50));
console.log('==========================================');

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Explicitly inject env vars into the build
    'import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL': JSON.stringify(process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || ''),
    'import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY': JSON.stringify(process.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''),
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
      registerType: 'autoUpdate',
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB (for large bundles with OCR/PDF libs)
        runtimeCaching: [
          // Google Sheets API - Network First
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-sheets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10
            }
          },
          // Google Drive API - Network Only (uploads)
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/upload\/drive\/.*/i,
            handler: 'NetworkOnly'
          },
          // Google Drive API - Network First (read)
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/drive\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-drive-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 30 // 30 minutes
              }
            }
          },
          // N8N Webhook - Network Only
          {
            urlPattern: /webhook/i,
            handler: 'NetworkOnly'
          },
          // Google Identity Services
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-auth-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          // Static resources - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
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
