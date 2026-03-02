/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

// SyncEvent no está en el lib DOM estándar — declaración mínima
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

/**
 * CROSSLOG - Service Worker Personalizado
 * Maneja: precache, push notifications, GPS geofence alerts, offline sync
 */

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// ============================================================
// PRECACHE (Workbox inyecta el manifest aquí)
// ============================================================
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ============================================================
// NETWORK ONLY — nunca cachear estas URLs
// Firebase, Google APIs, Webhooks
// ============================================================
const networkOnlyPatterns = [
  // Firebase Firestore
  /^https:\/\/firestore\.googleapis\.com\/.*/i,
  // Firebase Auth tokens
  /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
  /^https:\/\/securetoken\.googleapis\.com\/.*/i,
  // Firebase Storage
  /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
  /^https:\/\/storage\.googleapis\.com\/.*/i,
  // Firebase SDK
  /^https:\/\/www\.googleapis\.com\/identitytoolkit\/.*/i,
  // Google Sheets API (causa original del problema)
  /^https:\/\/sheets\.googleapis\.com\/.*/i,
  // Google Drive API
  /^https:\/\/www\.googleapis\.com\/upload\/drive\/.*/i,
  /^https:\/\/www\.googleapis\.com\/drive\/.*/i,
  // Google Auth
  /^https:\/\/accounts\.google\.com\/.*/i,
  /^https:\/\/oauth2\.googleapis\.com\/.*/i,
  // N8N Webhooks
  /webhook/i,
];

for (const pattern of networkOnlyPatterns) {
  registerRoute(
    ({ url }) => pattern.test(url.href),
    new NetworkOnly()
  );
}

// ============================================================
// CACHE FIRST — imágenes estáticas
// ============================================================
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'crosslog-images-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
      }),
    ],
  })
);

// ============================================================
// PUSH NOTIFICATIONS (desde servidor con VAPID)
// ============================================================
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; tag?: string; url?: string; icon?: string } = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'CROSSLOG', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    tag: data.tag || 'crosslog-alert',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(data.title || 'CROSSLOG', options)
  );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Intentar enfocar una ventana existente
        for (const client of windowClients) {
          if ('focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        // Abrir nueva ventana si no hay ninguna
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================================
// MENSAJES DESDE EL HILO PRINCIPAL
// ============================================================
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  // Activar nueva versión del SW inmediatamente
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Notificación GPS desde el hook useGPSTracking
  if (event.data?.type === 'GPS_NOTIFICACION') {
    const { titulo, cuerpo, tag } = event.data;
    self.registration.showNotification(titulo || 'CROSSLOG GPS', {
      body: cuerpo || '',
      icon: '/icon-192x192.svg',
      badge: '/icon-192x192.svg',
      tag: tag || 'crosslog-gps',
      vibrate: [300, 100, 300],
    } as NotificationOptions);
    return;
  }

  // Alerta de cubierta/mantenimiento
  if (event.data?.type === 'ALERTA_MANTENIMIENTO') {
    const { titulo, cuerpo, prioridad } = event.data;
    self.registration.showNotification(titulo || 'Alerta Mantenimiento', {
      body: cuerpo || '',
      icon: '/icon-192x192.svg',
      badge: '/icon-192x192.svg',
      tag: 'crosslog-mantenimiento',
      vibrate: prioridad === 'ALTA' ? [500, 100, 500, 100, 500] : [200, 100, 200],
    } as NotificationOptions);
    return;
  }
});

// ============================================================
// BACKGROUND SYNC — para datos GPS pendientes de envío
// ============================================================
self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'gps-sync') {
    syncEvent.waitUntil(
      // El SDK de Firebase maneja la sincronización de Firestore automáticamente
      // Este handler es para sincronización adicional si se necesita
      Promise.resolve()
    );
  }
});
