# Historial de Viajes y Rutas — Design Doc
**Fecha:** 2026-03-03
**Estado:** Aprobado

---

## Resumen

Sistema de registro y consulta de viajes por unidad. Cubre tres sectores: DISTRIBUCIÓN, VRAC y VITAL AIRE. Permite auditar recorridos, km, choferes, tarifas y cargas de combustible por viaje.

---

## 1. Estructura de datos — Firestore `viajes/`

### Colección nueva: `viajes/{viajeId}`

```
unidad:       string       // "41"
patente:      string       // "AB152AZ"
chofer:       string       // "NOVALVA"
sector:       string       // "distribucion" | "vrac" | "vital_aire"
hdr:          string|null  // "7472734" (null para VRAC y VitalAire)
fechaInicio:  Timestamp    // cuando el GPS arranca
fechaFin:     Timestamp    // cuando llega a base (null si estado != "completado")
kmRecorridos: number|null  // acumulado por el servicio Android nativo
baseNombre:   string       // "Base Los Cardales"
checklistId:  string       // referencia al checklist origen
tarifa:       string|null  // "Baradero" | "REPARTO" | null (solo distribución)
estado:       string       // "en_curso" | "completado" | "interrumpido"
```

### Reglas de escritura

| Evento | Acción |
|--------|--------|
| GPS arranca (checklist guardado) | Crear documento con `estado: "en_curso"`, `fechaFin: null` |
| GPS llega a base | Actualizar: `estado: "completado"`, `fechaFin`, `kmRecorridos`, `tarifa` |
| VRAC inicia nuevo checklist | Cerrar viaje anterior: `estado: "interrumpido"`, `fechaFin: now()` |

### Índices necesarios (Firestore)
- `sector` + `fechaInicio` (desc)
- `unidad` + `fechaInicio` (desc)
- `chofer` + `fechaInicio` (desc)
- `hdr` (único por viaje de distribución)

---

## 2. Panel lateral offline — PanelFlota

Cuando `activo: false` en `ubicaciones/{INT-XX}`, el panel muestra:

```
🔵 En Base · Base Los Cardales
   Llegó: lun 03/03 · 14:32 hs
   Último chofer: NOVALVA
   Combustible: SÍ
   Sin GPS activo
```

- **Llegó / timestamp**: campo `timestamp` ya en `ubicaciones/{INT-XX}`
- **Último chofer**: campo `chofer` ya en `ubicaciones/{INT-XX}`
- **Combustible SÍ/NO**: query a `cargas_combustible` donde `unidad.numero == unidad` y `fecha` dentro del último viaje completado → sin escrituras nuevas

---

## 3. Notificación Android — botón "Cerrar"

Al llegar a base, `buildNotification()` en `CrosslogGpsService.java` agrega una acción:

```java
.addAction(
    android.R.drawable.ic_menu_close_clear_cancel,
    "Cerrar",
    stopPendingIntent  // ACTION_STOP
)
```

El servicio ya se detuvo (`stopSelf()`) al detectar geofence. El botón solo descarta la notificación del tray. No requiere lógica adicional.

---

## 4. Página "Viajes y Rutas"

### Acceso
- **PanelFlota**: botón compacto `🗺️ Viajes y Rutas` al pie del sidebar lateral
- **ConsultaInterna**: nuevo `viewMode = 'viajes'` — botón en menú Operaciones

### Filtros
| Filtro | Sectores |
|--------|----------|
| Fecha desde / hasta | Todos |
| Sector | Todos |
| Unidad (INT-XX) | Todos |
| Chofer | Todos |
| HDR | Solo DISTRIBUCIÓN |
| Tarifa | Solo DISTRIBUCIÓN |

### Card de viaje

```
┌─────────────────────────────────────────┐
│ INT-41  [DIST]                          │
│ NOVALVA · HDR 7472734                   │
│ Lun 03/03  06:21 → 14:32  (8h 11m)     │
│ 43.9 km · Base Los Cardales             │
│ 🗺️ Baradero · ECOLAB  ⛽ Combustible: SÍ │
│ [Ver ruta]              [↓ CSV]         │
└─────────────────────────────────────────┘
```

Para VRAC (sin HDR ni tarifa):
```
┌─────────────────────────────────────────┐
│ INT-55  [VRAC]                          │
│ BERGOLO                                 │
│ Lun 03/03  05:00 → Mar 04/03  18:30     │
│ 1.365 km · Base Villa Maipú             │
│ ⛽ Combustible: SÍ                       │
│ [Ver ruta]              [↓ CSV]         │
└─────────────────────────────────────────┘
```

### Comportamiento VRAC
- Sin HDR ni tarifa
- Duración puede ser multi-día
- Si estado = "interrumpido" → se muestra con badge ⚠️ y sin `fechaFin` real

---

## 5. Cierre de viaje VRAC

En `ChecklistVRAC.tsx`, al llamar `handleGuardarChecklist`:
1. Antes de iniciar GPS → buscar en `viajes/` el último viaje `en_curso` para esa unidad
2. Si existe → actualizar `estado: "interrumpido"`, `fechaFin: serverTimestamp()`
3. Continuar con el flujo normal (crear nuevo viaje)

---

## Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `CrosslogGpsService.java` | Crear doc en `viajes/` al iniciar; actualizar al llegar a base con `kmRecorridos` + `tarifa` + `estado: "completado"` |
| `CrosslogGpsPlugin.java` | Pasar `fechaInicio` al Intent |
| `src/components/HistorialViajes.tsx` | Nuevo — página de historial con filtros y cards |
| `src/components/PanelFlota.tsx` | Botón "Viajes y Rutas" + info offline mejorada |
| `src/components/ConsultaInterna.tsx` | Nuevo `viewMode = 'viajes'` + botón en Operaciones |
| `src/components/ChecklistVRAC.tsx` | Cerrar viaje anterior antes de iniciar GPS |
