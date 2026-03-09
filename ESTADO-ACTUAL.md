# CROSSLOG PWA — Estado Actual

**Fecha:** 06 Marzo 2026
**Versión:** 3.2.0
**Stack:** React 19 + TypeScript + Vite + Firebase Firestore + Capacitor 7 + Tailwind CSS

---

## 🏗️ Arquitectura

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS |
| Base de datos | Firebase Firestore (proyecto: `croog-marketplace`) |
| App móvil | Capacitor 7 → APK Android |
| GPS nativo | `CrosslogGpsService.java` (Foreground Service) |
| Notificaciones | `@capacitor/local-notifications` |
| Mapas | Google Maps API (vanilla JS) |

---

## 📱 APK Android

- **Última compilación:** 06 Mar 2026
- **Archivo:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Package:** `com.crosslog.app`
- **Permisos:** GPS (foreground + background), notificaciones, internet, BOOT_COMPLETED

---

## ✅ Módulos Funcionales

### 1. LOGIN
- Pantalla de acceso por tipo de usuario (Interno / Cliente / Fletero)
- Logo Crosslog en círculo blanco
- "CROSSLOG" en blanco con espaciado amplio
- Subtítulo en verde `#a8e063`

### 2. GPS TRACKING — `CrosslogGpsService.java`
- **Intervalo:** 10 segundos
- **Umbral salida de base:** 100 metros
- **Umbral llegada a base:** 100 metros (solo Base Los Cardales)
- **Filtros de calidad GPS:**
  - Speed-based Accuracy (parado <5km/h → exige 15m precisión)
  - Salto posicional irreal (descarta si velocidad implícita > 130 km/h)
  - Kalman Filter 1D (suaviza lat/lng con ruido de proceso Q=3.0)
  - Heading Filter (descarta giros > 120° a velocidades > 30 km/h)
- **Resiliencia (✅ probado 06/03/26):**
  - `START_STICKY` → Android reinicia el servicio si lo mata
  - `BOOT_COMPLETED` → reanuda el viaje automáticamente al encender el teléfono ✅
  - GPS sobrevive al cerrar todas las apps (foreground service nativo) ✅
  - `stoppedIntentionally` → prefs se conservan si el apagado fue por batería/sistema
  - Prefs solo se limpian cuando el viaje termina correctamente (llegó a base o paró manual)
  - `intent.hasExtra("unidad")` → distingue inicio normal de reinicio por boot/sistema
- **Bases registradas:**
  - Base Los Cardales: `-34.360, -59.010` (única base de llegada)
  - Base Villa Maipú: `-34.563, -58.529` (solo para detección de salida)

### 3. CHECKLIST DISTRIBUCIÓN
- Activado por número HDR
- GPS se inicia al completar el checklist
- Pre-fill de odómetro desde último viaje
- Si la app se cierra y se reabre: detecta HDR activo en `gps_activos/` y reanuda GPS
- Pantalla "Aún en Base" hasta alejarse > 100m
- Al iniciar nuevo viaje: cierra viajes `en_curso` anteriores de la misma unidad → `interrumpido`

### 4. CHECKLIST VRAC
- Activado por unidad + cisterna + chofer
- GPS tracking durante el viaje
- Pre-fill de odómetro desde último viaje
- Marca viajes anteriores como "interrumpido" si había uno en curso
- Pantalla "Aún en Base"

### 5. CHECKLIST VITAL AIRE
- Sin GPS
- Checklist de seguridad estándar

### 6. PANEL FLOTA — `PanelFlota.tsx`
- Mapa en tiempo real con marcadores de todas las unidades
- Panel lateral colapsable (▶/◀) sin perder el mapa
- Filtros por sector: Todos / VRAC / Distribución / Vital Aire
- Contadores de unidades activas 🟢 y en base 🔵
- Al seleccionar una unidad: historial del día, carga de combustible, ruta en mapa
- Botón GPS habilitado/deshabilitado (control global)

### 7. HISTORIAL DE VIAJES — `HistorialViajes.tsx`
- Filtros: fecha, sector, unidad, chofer, HDR, tarifa
- Cards por viaje: unidad, sector, chofer, HDR, fechas, duración, km, base, estado
- Botón 🗺️ Ver ruta → `MapaViajeModal` con polyline por velocidad (verde/amarillo/rojo)
- Botón ↓ CSV exporta metadata (separador `;`, compatible Excel español)
- Eliminar viaje con confirmación
- Douglas-Peucker para simplificar ruta (epsilon = 8m)

### 8. COMBUSTIBLE
- Registro de cargas por unidad
- Alertas de consumo
- PanelFlota muestra carga del día en verde si hubo carga

### 9. CUBIERTAS — `PanelCubiertas.tsx`
- Seguimiento de desgaste por unidad
- Soporte Vital Aire (medida `195/75 R16C`, umbral crítico 3mm)
- Umbrales VRAC/DIST: crítico < 4mm

### 10. DOCUMENTOS
- Gestión de documentos por chofer y unidad
- Dashboard admin

---

## 🗄️ Colecciones Firebase Firestore

| Colección | Descripción |
|-----------|-------------|
| `ubicaciones/{INT-XX}` | Última posición de cada unidad |
| `ubicaciones/{INT-XX}/historial` | Puntos GPS históricos |
| `viajes/{viajeId}` | Registro de cada viaje (en_curso / completado / interrumpido) |
| `gps_activos/{hdr}` | Estado GPS activo por HDR (Distribución) |
| `checklists/{id}` | Checklists completados |
| `cargas_combustible/{id}` | Registros de carga de combustible |
| `configuracion/gps_tracking` | Switch global GPS habilitado/deshabilitado |
| `cubiertas/{id}` | Registros de cubiertas por unidad |

---

## 🏢 Bases

| Base | Lat | Lng |
|------|-----|-----|
| Los Cardales | -34.36014566238795 | -59.00991328060013 |
| Villa Maipú | -34.56297844053954 | -58.52935080773911 |

---

## 🔧 Comandos Frecuentes

```bash
# Servidor de desarrollo
npm run dev -- --port 3003

# Build + sync Android
npm run build && npx cap sync android

# Abrir Android Studio
npx cap open android

# Verificar TypeScript
npx tsc --noEmit
```

---

## ⏳ Pendientes / Próximos pasos

- [x] ~~Testear GPS con batería muerta → encender → verifica reanudación automática~~ ✅ FUNCIONA
- [x] ~~Testear llegada confirmada solo en Los Cardales (no Villa Maipú)~~ ✅ FUNCIONA
- [x] ~~Verificar `viajes/` se crea en Firestore al iniciar GPS~~ ✅ FUNCIONA
- [ ] Revisar Samsung/Xiaomi: foreground service sobrevive al cerrar apps
- [ ] Índices Firestore: `viajes (unidad + estado)`, `viajes (sector + fechaInicio)`
- [x] ~~Viajes "zombie" → ACTION_STOP ahora marca viaje como `interrumpido` en Firestore~~ ✅
- [x] ~~Notificación llegada a base: `.setAutoCancel(true)` → se cierra al tocar~~ ✅

---

## 📂 Archivos Clave

```
src/
  components/
    Login.tsx                     Pantalla de acceso
    PanelFlota.tsx                Panel de flota en tiempo real
    HistorialViajes.tsx           Historial de viajes
    MapaViajeModal.tsx            Modal de ruta con Google Maps
    ChecklistDistribucion.tsx     Checklist + GPS distribución
    ChecklistVRAC.tsx             Checklist + GPS VRAC
    ChecklistVitalAire.tsx        Checklist Vital Aire
    cubiertas/PanelCubiertas.tsx  Gestión de cubiertas
    combustible/FormularioCargaCombustible.tsx
  hooks/
    useGPSTracking.ts             Hook GPS (web + nativo)
  assets/
    icon-only - copia.png         Logo Crosslog (círculo login)

android/app/src/main/java/com/crosslog/app/
  CrosslogGpsService.java         Servicio GPS nativo
  CrosslogBootReceiver.java       Receptor BOOT_COMPLETED
  CrosslogGpsPlugin.java          Bridge Capacitor ↔ Java
  MainActivity.java               Actividad principal
```
