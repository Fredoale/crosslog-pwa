import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Import Firebase testing utilities (available in console as window.testFirebase)
import './tests/testChecklistFirebase';
// Import Firebase cleanup utilities (available in console as window.cleanupFirebase)
import './tests/cleanupTestData';

// ============================================================
// Service Worker — PWA con GPS tracking offline
// ============================================================
const updateSW = registerSW({
  onNeedRefresh() {
    // Nueva versión disponible — actualizar automáticamente
    updateSW(true);
    console.log('[PWA] Nueva versión instalada');
  },
  onOfflineReady() {
    console.log('[PWA] App lista para funcionar offline');
  },
  onRegistered(registration) {
    console.log('[PWA] Service Worker registrado:', registration?.scope);
  },
  onRegisterError(error) {
    console.error('[PWA] Error registrando Service Worker:', error);
  },
});

// Solicitar permiso de notificaciones (para alertas GPS y mantenimiento)
if ('Notification' in window && Notification.permission === 'default') {
  // Solicitar permiso después de la primera interacción del usuario
  document.addEventListener('click', function requestOnFirstInteraction() {
    Notification.requestPermission().then((permission) => {
      console.log('[PWA] Permiso notificaciones:', permission);
    });
    document.removeEventListener('click', requestOnFirstInteraction);
  }, { once: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
