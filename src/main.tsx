import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import Firebase testing utilities (available in console as window.testFirebase)
import './tests/testChecklistFirebase';
// Import Firebase cleanup utilities (available in console as window.cleanupFirebase)
import './tests/cleanupTestData';

// Service Worker TEMPORARILY DISABLED
// Causing issues with Google Sheets API requests
// Will re-enable after fixing Workbox configuration

// Unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
      console.log('[PWA] Service Worker unregistered')
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
