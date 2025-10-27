import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New content available, updating...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline')
  },
  onRegistered(registration) {
    console.log('[PWA] Service Worker registered:', registration)
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration failed:', error)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
