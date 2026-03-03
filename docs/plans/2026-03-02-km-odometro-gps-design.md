# Design: Cálculo automático de km recorridos + odómetro final

**Fecha:** 2026-03-02
**Estado:** Aprobado

---

## Problema

El sistema registra el odómetro inicial en el checklist pero no el final. Los km recorridos no se calculan ni se almacenan, lo que impide:
- Análisis diario de costos por viaje
- Auditorías de recorrido (GPS vs odómetro declarado)
- Alertas automáticas de mantenimiento preventivo basadas en km reales

---

## Solución elegida: Opción A — Cálculo nativo en Android GPS Service

El `CrosslogGpsService` ya corre en background, tiene la fórmula Haversine implementada y conoce el `checklistId`. Es el lugar más confiable para acumular la distancia y escribir el resultado al llegar a base, sin depender de ninguna pantalla abierta y sin costo adicional de infraestructura.

---

## Flujo de datos

```
Checklist completado (VRAC / DISTRIBUCIÓN / VITAL AIRE)
  ↓ startTracking({ ..., odometroInicial: 60823 })
  ↓
CrosslogGpsService (Android foreground service)
  → Acumula distanciaAcumuladaKm entre puntos GPS consecutivos
    (solo después de confirmar hasLeftBase = true)
  → Al detectar llegada a base:
      ┌─ checklists/{checklistId}
      │    kmRecorridos: X
      │    odometroFinal: { valor: odometroInicial + X, fecha_hora: serverTimestamp }
      └─ ubicaciones/INT-{unidad}
           kmRecorridos: X   ← para display inmediato en PanelFlota
  ↓
PanelFlota (web — supervisor)
  → Historial cargado: suma Haversine entre puntos consecutivos
  → Card: 🛣️ km recorridos | odómetro inicial → final estimado
  → Botón: Descargar CSV del recorrido
```

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `CrosslogGpsService.java` | Variables acumuladoras + escritura a Firestore al llegar |
| `CrosslogGpsPlugin.java` | Agregar parámetro `odometroInicial` (double) al Intent |
| `useGPSTracking.ts` | Agregar `odometroInicial?: number` a `TrackingConfig` |
| `ChecklistVRAC.tsx` | Pasar `odometroInicial` al llamar `startTracking` |
| `ChecklistDistribucion.tsx` | Ídem |
| `ChecklistVitalAire.tsx` | Ídem |
| `PanelFlota.tsx` | Card de resumen + cálculo Haversine + exportar CSV |

---

## Detalle técnico

### CrosslogGpsService.java — variables nuevas
```java
private double odometroInicialKm = 0.0;
private double distanciaAcumuladaKm = 0.0;
private double latAnterior = Double.NaN;
private double lngAnterior = Double.NaN;
```

### Acumulación en processLocation (solo post-salida de base)
```java
if (hasLeftBase && !Double.isNaN(latAnterior)) {
    distanciaAcumuladaKm += calcularDistancia(latAnterior, lngAnterior, lat, lng) / 1000.0;
}
latAnterior = lat;
lngAnterior = lng;
```

### Escritura al llegar a base
```java
// En checklists/{checklistId}
Map<String, Object> checklistUpdate = new HashMap<>();
checklistUpdate.put("kmRecorridos", distanciaAcumuladaKm);
Map<String, Object> odometroFinal = new HashMap<>();
odometroFinal.put("valor", odometroInicialKm + distanciaAcumuladaKm);
odometroFinal.put("fecha_hora", FieldValue.serverTimestamp());
checklistUpdate.put("odometroFinal", odometroFinal);
db.collection("checklists").document(checklistId).update(checklistUpdate);

// En ubicaciones/INT-{unidad}
Map<String, Object> ubicUpdate = new HashMap<>();
ubicUpdate.put("kmRecorridos", distanciaAcumuladaKm);
db.collection("ubicaciones").document("INT-" + unidad).update(ubicUpdate);
```

### PanelFlota — card de resumen
```typescript
// Calcular desde puntos ya cargados
const calcularKmHistorial = (puntos: HistorialPunto[]): number =>
  puntos.reduce((total, p, i) => {
    if (i === 0) return 0;
    return total + haversineKm(puntos[i-1].lat, puntos[i-1].lng, p.lat, p.lng);
  }, 0);
```

Card UI (encima del mapa del recorrido):
```
┌─────────────────────────────────────────────┐
│ 🛣️  127.4 km recorridos                     │
│ Odóm. inicial: 60.823 km                    │
│ Odóm. final estimado: 60.950 km             │
│                          [↓ Descargar CSV]  │
└─────────────────────────────────────────────┘
```

### CSV — estructura
- **Nombre:** `historial_INT41_2026-03-02.csv`
- **Encabezado:** `INT-{unidad} | {patente} | {chofer} | {fecha} | {km total}`
- **Columnas:** `Fecha,Hora,Latitud,Longitud,Velocidad (km/h),Km acumulado`

---

## Casos especiales

- **Sin checklistId**: Si el GPS inicia sin checklist, no escribe a `checklists/` (guarda en `ubicaciones/` igualmente)
- **Odómetro inicial = 0**: Si no se pasó valor, `odometroFinal` queda igual a `kmRecorridos`
- **GPS reiniciado por sistema**: `distanciaAcumuladaKm` se resetea a 0 (no persiste en SharedPreferences — pérdida aceptable)
- **Historial vacío en PanelFlota**: La card no se muestra si hay menos de 2 puntos

---

## Criterios de éxito

1. Al llegar a base, `checklists/{id}` tiene `odometroFinal.valor` y `kmRecorridos`
2. `ubicaciones/INT-{unidad}` tiene `kmRecorridos` visible en tiempo real
3. PanelFlota muestra la card con km calculados desde los puntos GPS
4. El CSV descargado tiene todos los puntos del día con km acumulado por fila
5. Los tres tipos de checklist (VRAC, Distribución, Vital Aire) pasan `odometroInicial`
