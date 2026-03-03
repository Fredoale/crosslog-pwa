# Design: GPS Auto-activación + Modal Buen Viaje + Notificaciones
**Fecha:** 2026-02-23
**Estado:** Aprobado

---

## Contexto

Actualmente los 3 checklists (VRAC, Distribución, VitalAire) requieren que el chofer
pulse un botón "Activar GPS" en una pantalla dedicada. El estado GPS (en base, en ruta,
llegada) se muestra como pantalla completa. El supervisor no recibe alertas.

**Objetivo:** GPS silencioso + modal de bienvenida personalizado + notificaciones push
para chofer y supervisor.

---

## Feature 1: GPS Auto-activación + Modal "Buen Viaje"

### Flujo nuevo (todos los sectores)

```
Checklist guardado
    ↓
gpsTracking.startTracking() — automático, sin pantalla de confirmación
    ↓
Modal "Buen Viaje" — auto-dismiss 8 segundos
    • ¡Buen viaje, [NOMBRE]! 🚀
    • INT-XXX · Patente · Sector
    • Para Distribución: número de HDR
    • Recordatorio vial: velocidad, cinturón, sin celular al conducir
    • Contador regresivo visible (8…7…6…)
    • Botón "Comenzar ruta" para cerrar antes
    ↓
Pantalla "Aún en Base" → En Ruta → geofence arribo
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `ChecklistVRAC.tsx` | Eliminar step `activar-gps`; auto-start GPS al guardar; agregar modal Buen Viaje |
| `ChecklistDistribucion.tsx` | Ídem |
| `ChecklistVitalAire.tsx` | Agregar `useGPSTracking`; auto-start; modal Buen Viaje; pantalla "Aún en Base" |

### Modal "Buen Viaje" — componente reutilizable

Componente `BienvenidaViajeModal` en `src/components/BienvenidaViajeModal.tsx`:

```tsx
interface BienvenidaViajeModalProps {
  chofer: string;
  unidad: string;
  patente: string;
  sector: 'vrac' | 'distribucion' | 'vital_aire';
  hdr?: string;
  onDismiss: () => void;
}
```

- Auto-dismiss con `setInterval` de 1 segundo, countdown desde 8
- Colores del sector (verde VRAC/DIST, naranja VitalAire)
- Se monta justo después de iniciar GPS; al cerrar → pantalla "Aún en Base"

---

## Feature 2: Notificaciones push al chofer

### Eventos y mensajes

| Evento en `useGPSTracking` | Notificación |
|---------------------------|-------------|
| `hasLeftBase` (>500m) | `🚀 En Ruta — GPS activo, INT-{unidad}` |
| `arrivedAtBase` (≤100m) | `🏠 Llegaste a {baseNombre} — GPS detenido` |

### Implementación por plataforma

**Web (Service Worker):**
- `mostrarNotificacionSalida(unidad)` → `postMessage` al SW con `type: 'GPS_NOTIFICACION'`
- El SW ya maneja ese tipo de mensaje y muestra la notificación

**APK Android:**
- Instalar `@capacitor/local-notifications`
- En native: `LocalNotifications.schedule()` con el mensaje de salida/llegada
- El plugin de BackgroundGeolocation ya muestra la notificación persistente del tray;
  las notificaciones de evento son adicionales y puntuales

### Cambios en `useGPSTracking.ts`

1. Agregar función `mostrarNotificacionSalida(unidad: string)` (análoga a la existente de llegada)
2. Llamarla cuando `hasLeftBase` se activa por primera vez
3. Mejorar `mostrarNotificacionBase` con nombre de base

---

## Feature 3: Notificación in-app al supervisor (PanelFlota)

### Detección de cambios de estado

En `PanelFlota.tsx`, el `onSnapshot` actualiza `ubicaciones`. Se agrega un
`prevUbicacionesRef` que guarda el estado anterior. En cada update se compara:

| Transición | Toast | Sonido |
|-----------|-------|--------|
| `activo: false → true` | 🟢 "INT-XXX salió de base" | beep corto |
| `enBase: false → true` | 🔵 "INT-XXX llegó a {base}" | beep corto |

### Restricción horaria

Solo dispara si `hora >= 6 && hora < 18` (horario de supervisión).
Evita notificaciones molestas si la pantalla quedó abierta de noche.

### Sonido

Archivo `/public/sounds/beep.mp3` (clip corto ~0.5s).
Reproducción: `new Audio('/sounds/beep.mp3').play()`.

---

## Dependencias nuevas

| Paquete | Razón | Instalación |
|---------|-------|-------------|
| `@capacitor/local-notifications` | Push puntual en APK Android | `npm install @capacitor/local-notifications && npx cap sync android` |

---

## Orden de implementación sugerido

1. Componente `BienvenidaViajeModal` (reutilizable)
2. `useGPSTracking.ts` — agregar notificación de salida + instalar local-notifications
3. `ChecklistVRAC.tsx` — eliminar `activar-gps`, auto-start, modal
4. `ChecklistDistribucion.tsx` — ídem
5. `ChecklistVitalAire.tsx` — agregar GPS completo
6. `PanelFlota.tsx` — diff de estados + toast + sonido
7. Build + sync + APK
