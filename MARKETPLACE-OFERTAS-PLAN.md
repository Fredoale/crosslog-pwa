# 📋 PLAN DE IMPLEMENTACIÓN: SISTEMA DE OFERTAS MARKETPLACE

## 🎯 Objetivo
Permitir que fleteros externos puedan ofertar en viajes publicados por Crosslog, con sistema de evaluación, scoring y asignación inteligente.

---

## 📊 Flujo Completo del Sistema

### 1️⃣ **Crosslog publica viaje**
```
BORRADOR → PUBLICADO
```
- Admin de Crosslog crea viaje con todos los detalles
- Define tiempo límite para recibir ofertas (ej: 24 horas)
- Cambia estado a PUBLICADO
- Los fleteros ya pueden ver el viaje y ofertar

### 2️⃣ **Fleteros ofertan**
```
PUBLICADO → EVALUANDO (cuando hay ofertas)
```
- Fleteros ven lista de viajes PUBLICADOS
- Pueden ofertar indicando:
  - Precio ofertado
  - Unidad disponible (tipo de camión)
  - Patente
  - Disponibilidad
  - Notas/comentarios
- Sistema valida que no hayan ofertado antes en ese viaje

### 3️⃣ **Crosslog evalúa ofertas**
```
EVALUANDO → ASIGNADO
```
- Crosslog ve todas las ofertas recibidas
- Sistema calcula score automático por oferta:
  - Precio (40% peso)
  - Rating del fletero (30% peso)
  - Tiempo de respuesta (15% peso)
  - Historial de viajes completados (15% peso)
- Crosslog puede:
  - Ver recomendación automática
  - Aceptar una oferta
  - Rechazar ofertas
  - Negociar (futuro)

### 4️⃣ **Asignación y ejecución**
```
ASIGNADO → EN_CURSO → COMPLETADO
```
- Fletero asignado recibe notificación
- Puede ver detalles del viaje
- Inicia viaje (estado EN_CURSO)
- Completa entregas usando la app
- Sistema marca como COMPLETADO

---

## 🗂️ Estructura de Datos (YA CREADAS EN GOOGLE SHEETS)

### **Tabla: Marketplace_Viajes** ✅

| Columna | Nombre | Ejemplo |
|---------|--------|---------|
| A | `HDR_viaje` | `VJ-2025-789012` |
| B | `cliente_id` | `ECO` |
| C | `cliente_nombre` | `ECOLAB` |
| D | `fecha_viaje` | `2025-12-01` |
| E | `fecha_publicacion` | `2025-11-30T10:00:00Z` |
| F | `estado` | `PUBLICADO` |
| G | `precio_base` | `250000` |
| H | `tipo_unidad_requerida` | `Camión 12 TON` |
| I | `peso_kg` | `12000` |
| J | `tipo_carga` | `GENERALES` |
| K | `detalles_ruta` | JSON con cargas/descargas |
| L | `tiempo_limite_oferta` | `2025-11-30T18:00:00Z` |
| M | `total_ofertas` | `5` |
| N | `fletero_asignado` | `VIMAAB` |
| O | `precio_final` | `240000` |
| P | `hdr_generado` | `TOY-001` |
| Q | `fecha_asignacion` | `2025-11-30T16:00:00Z` |
| R | `fecha_completado` | `2025-12-01T18:00:00Z` |
| S | `rating_viaje` | `4.5` |
| T | `notas_internas` | `HDR: TOY-001 | Tarifario: pgsm` |

### **Tabla: Marketplace_Ofertas** ✅

| Columna | Nombre | Ejemplo |
|---------|--------|---------|
| A | `id_oferta` | `OF-2025-123456` |
| B | `HDR_viaje` | `VJ-2025-789012` |
| C | `fletero_nombre` | `VIMAAB` |
| D | `fletero_id` | `FLE-VIMAAB` |
| E | `precio_ofertado` | `240000` |
| F | `unidad_ofrecida` | `Camión 12 TON` |
| G | `patente_unidad` | `AB123CD` |
| H | `chofer_asignado` | `Juan Pérez` |
| I | `telefono_chofer` | `+54 11 1234-5678` |
| J | `tiempo_estimado_horas` | `8` |
| K | `mensaje_adicional` | `Disponible desde las 6 AM` |
| L | `fecha_oferta` | `2025-11-30T14:30:00Z` |
| M | `estado` | `PENDIENTE` / `ACEPTADA` / `RECHAZADA` |
| N | `score_algoritmo` | `85.5` |
| O | `fecha_respuesta` | `2025-11-30T16:00:00Z` |
| P | `motivo_rechazo` | `Precio muy alto` |

### **Tabla: Marketplace_Ratings** ✅

| Columna | Nombre | Ejemplo |
|---------|--------|---------|
| A | `id_rating` | `RAT-2025-123456` |
| B | `HDR_viaje` | `VJ-2025-789012` |
| C | `hdr` | `TOY-001` |
| D | `fletero_nombre` | `VIMAAB` |
| E | `rating_puntualidad` | `5` |
| F | `rating_calidad` | `4` |
| G | `rating_documentacion` | `5` |
| H | `rating_comunicacion` | `4` |
| I | `rating_promedio` | `4.5` |
| J | `comentarios` | `Excelente servicio` |
| K | `fecha_calificacion` | `2025-12-01T20:00:00Z` |
| L | `calificado_por` | `crosslog_admin` |
| M | `viaje_completado_a_tiempo` | `SI` / `NO` |
| N | `incidencias` | `Ninguna` |

### **Tabla: Fleteros_Perfil** ✅

| Columna | Nombre | Ejemplo |
|---------|--------|---------|
| A | `id_fletero` | `FLE-VIMAAB` |
| B | `nombre_fletero` | `VIMAAB` |
| C | `razon_social` | `VIMAAB S.A.` |
| D | `cuit` | `30-12345678-9` |
| E | `contacto_principal` | `Roberto Gómez` |
| F | `telefono` | `+54 11 1234-5678` |
| G | `email` | `contacto@vimaab.com` |
| H | `rating_promedio` | `4.5` |
| I | `total_viajes_completados` | `150` |
| J | `total_viajes_cancelados` | `3` |
| K | `unidades_disponibles` | `8` |
| L | `tipos_unidades` | `12 TON, 20 TON, 30 TON` |
| M | `radio_operativo_km` | `500` |
| N | `zonas_operativas` | `CABA, GBA, La Plata` |
| O | `activo` | `TRUE` / `FALSE` |
| P | `fecha_registro` | `2024-01-15` |
| Q | `codigo_acceso_marketplace` | `VIM2025` |
| R | `observaciones` | `Empresa confiable` |

---

## 🔧 Componentes a Crear

### 1. **OfertasSection.tsx** (Vista Fletero)

**Ubicación:** `src/components/marketplace/OfertasSection.tsx`

**Funcionalidad:**
- Lista de viajes PUBLICADOS disponibles para ofertar
- Filtros: fecha, tipo de carga, ubicación
- Botón "Ofertar" en cada viaje
- Ver mis ofertas (PENDIENTES, ACEPTADAS, RECHAZADAS)

**UI:**
```tsx
<div className="viajes-disponibles">
  {viajes.map(viaje => (
    <ViajeDisponibleCard
      viaje={viaje}
      onOfertar={() => openOfertaModal(viaje)}
      yaOferto={hasUserOffered(viaje.HDR_viaje)}
    />
  ))}
</div>
```

### 2. **OfertaModal.tsx** (Formulario de Oferta)

**Ubicación:** `src/components/marketplace/OfertaModal.tsx`

**Campos:**
```tsx
interface OfertaForm {
  precio_ofertado: number;
  unidad_ofrecida: string; // Select de unidades disponibles del fletero
  patente_unidad: string;
  chofer_asignado: string;
  telefono_chofer: string;
  tiempo_estimado_horas: number;
  mensaje_adicional: string;
}
```

**Validaciones:**
- Precio > 0
- Unidad y patente requeridos
- No puede ofertar si ya tiene oferta pendiente
- Viaje debe estar en estado PUBLICADO

**Acciones:**
```typescript
const handleSubmitOferta = async (formData: OfertaForm) => {
  // 1. Validar que no haya ofertado antes
  const yaOferto = await verificarOfertaExistente(HDR_viaje, fletero_id);
  if (yaOferto) {
    alert('Ya has ofertado en este viaje');
    return;
  }

  // 2. Crear oferta
  const oferta = {
    id_oferta: generarIdOferta(),
    HDR_viaje,
    fletero_id,
    fletero_nombre,
    ...formData,
    fecha_oferta: new Date().toISOString(),
    estado_oferta: 'PENDIENTE',
    tiempo_respuesta_horas: calcularTiempoRespuesta(viaje.fecha_publicacion)
  };

  // 3. Guardar en Google Sheets vía Apps Script
  await crearOfertaMarketplace(oferta);

  // 4. Actualizar contador en viaje
  await actualizarContadorOfertas(HDR_viaje);

  // 5. Cerrar modal y notificar
  onClose();
  alert('✅ Oferta enviada exitosamente');
};
```

### 3. **OfertasDetail.tsx** (Vista Admin Crosslog)

**Ubicación:** `src/components/marketplace/OfertasDetail.tsx`

**Funcionalidad:**
- Ver todas las ofertas de un viaje específico
- Mostrar score calculado por oferta
- Resaltar oferta recomendada
- Botones: Aceptar, Rechazar
- Ver perfil del fletero (rating, historial)

**UI:**
```tsx
<div className="ofertas-list">
  <h3>Ofertas para viaje {HDR_viaje} ({ofertas.length})</h3>

  {/* Oferta Recomendada */}
  {ofertaRecomendada && (
    <div className="recomendada">
      <OfertaCard
        oferta={ofertaRecomendada}
        destacada={true}
        onAceptar={handleAceptar}
        onRechazar={handleRechazar}
      />
    </div>
  )}

  {/* Otras Ofertas */}
  {otrasOfertas.map(oferta => (
    <OfertaCard
      key={oferta.id_oferta}
      oferta={oferta}
      onAceptar={handleAceptar}
      onRechazar={handleRechazar}
    />
  ))}
</div>
```

**Datos mostrados por oferta:**
```tsx
<OfertaCard>
  {/* Header */}
  <div className="header">
    <h4>{oferta.fletero_nombre}</h4>
    <div className="score">
      Score: {oferta.score_calculado}/100
      {esRecomendada && <span>⭐ RECOMENDADA</span>}
    </div>
  </div>

  {/* Detalles */}
  <div className="detalles">
    <p>💰 Precio: ${formatNumber(oferta.precio_ofertado)}</p>
    <p>🚛 Unidad: {oferta.unidad_ofrecida} - {oferta.patente_unidad}</p>
    <p>👤 Chofer: {oferta.chofer_asignado}</p>
    <p>📞 Teléfono: {oferta.telefono_chofer}</p>
    <p>⏱️ Tiempo estimado: {oferta.tiempo_estimado_horas}h</p>
    <p>📝 Mensaje: {oferta.mensaje_adicional}</p>
  </div>

  {/* Perfil Fletero */}
  <div className="perfil">
    <p>🏢 Razón social: {fletero.razon_social}</p>
    <p>⭐ Rating: {fletero.rating_promedio}/5</p>
    <p>📦 Viajes completados: {fletero.total_viajes_completados}</p>
    <p>❌ Cancelados: {fletero.total_viajes_cancelados}</p>
    <p>🚛 Unidades disponibles: {fletero.unidades_disponibles}</p>
    <p>📍 Radio operativo: {fletero.radio_operativo_km} km</p>
    <p>🗺️ Zonas: {fletero.zonas_operativas}</p>
  </div>

  {/* Acciones */}
  <div className="actions">
    <button onClick={() => onAceptar(oferta)}>✅ Aceptar</button>
    <button onClick={() => onRechazar(oferta)}>❌ Rechazar</button>
  </div>
</OfertaCard>
```

### 4. **Sistema de Scoring**

**Ubicación:** `src/utils/scoringSystem.ts`

**Fórmula:**
```typescript
interface ScoreWeights {
  precio: 0.40;      // 40% - Precio competitivo
  rating: 0.30;      // 30% - Calidad del fletero
  tiempo: 0.15;      // 15% - Rapidez de respuesta
  historial: 0.15;   // 15% - Experiencia
}

function calcularScore(
  oferta: OfertaMarketplace,
  viaje: ViajeMarketplace,
  fletero: FleteroPerfilMarketplace
): number {
  // 1. Score de Precio (menor es mejor, máx 100 puntos)
  const precioBase = viaje.precio_base;
  const diferenciaPrecio = ((oferta.precio_ofertado - precioBase) / precioBase) * 100;
  const scorePrecio = Math.max(0, 100 - Math.abs(diferenciaPrecio));

  // 2. Score de Rating (0-5 → 0-100)
  const scoreRating = (fletero.rating_promedio / 5) * 100;

  // 3. Score de Tiempo Estimado (más rápido es mejor)
  const tiempoMaximo = 24; // horas
  const scoreTiempo = Math.max(0, 100 - (oferta.tiempo_estimado_horas / tiempoMaximo * 100));

  // 4. Score de Historial
  const totalViajes = fletero.total_viajes_completados + fletero.total_viajes_cancelados;
  const tasaCompletados = totalViajes > 0
    ? (fletero.total_viajes_completados / totalViajes) * 100
    : 0;
  const scoreHistorial = Math.min(100, tasaCompletados);

  // 5. Penalización por viajes cancelados
  const penalizacionCancelados = Math.min(20, fletero.total_viajes_cancelados * 2);

  // Score final ponderado
  const scoreFinal =
    scorePrecio * 0.40 +
    scoreRating * 0.30 +
    scoreTiempo * 0.15 +
    scoreHistorial * 0.15 -
    penalizacionCancelados;

  return Math.max(0, Math.round(scoreFinal * 10) / 10); // 1 decimal, mínimo 0
}
```

---

## 📡 API Functions (marketplaceApi.ts)

### Crear Oferta
```typescript
export async function crearOfertaMarketplace(oferta: Partial<OfertaMarketplace>): Promise<string> {
  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  const payload = {
    action: 'CREATE_MARKETPLACE_OFERTA',
    data: {
      id_oferta: `OF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      HDR_viaje: oferta.HDR_viaje,
      fletero_id: oferta.fletero_id,
      fletero_nombre: oferta.fletero_nombre,
      precio_ofertado: oferta.precio_ofertado,
      unidad_ofrecida: oferta.unidad_ofrecida,
      patente_unidad: oferta.patente_unidad,
      fecha_oferta: new Date().toISOString(),
      estado_oferta: 'PENDIENTE',
      notas_fletero: oferta.notas_fletero || '',
      tiempo_respuesta_horas: oferta.tiempo_respuesta_horas || 0,
      score_calculado: 0 // Se calculará después
    }
  };

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const result = await response.text();
  return payload.data.id_oferta;
}
```

### Obtener Ofertas de un Viaje
```typescript
export async function obtenerOfertasDeViaje(HDR_viaje: string): Promise<OfertaMarketplace[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${MARKETPLACE_SPREADSHEET_ID}/values/Marketplace_Ofertas!A2:N?key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.values) return [];

  const ofertas = data.values
    .map((row: any[]) => ({
      id_oferta: row[0],
      HDR_viaje: row[1],
      fletero_nombre: row[2],
      fletero_id: row[3],
      precio_ofertado: Number(row[4]),
      unidad_ofrecida: row[5],
      patente_unidad: row[6],
      fecha_oferta: row[7],
      estado_oferta: row[8],
      notas_fletero: row[9],
      tiempo_respuesta_horas: Number(row[10]),
      score_calculado: Number(row[11]),
      fecha_evaluacion: row[12],
      motivo_rechazo: row[13]
    }))
    .filter((oferta: OfertaMarketplace) => oferta.HDR_viaje === HDR_viaje);

  return ofertas;
}
```

### Actualizar Estado de Oferta
```typescript
export async function actualizarEstadoOferta(
  id_oferta: string,
  estado: 'ACEPTADA' | 'RECHAZADA',
  motivo?: string
): Promise<void> {
  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  const payload = {
    action: 'UPDATE_MARKETPLACE_OFERTA',
    id_oferta,
    updates: {
      estado_oferta: estado,
      fecha_evaluacion: new Date().toISOString(),
      motivo_rechazo: motivo || ''
    }
  };

  await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
```

### Calcular Scores
```typescript
export async function calcularScoreOfertas(ofertas: OfertaMarketplace[]): Promise<FleteroScore[]> {
  // 1. Obtener datos de fleteros
  const fleterosData = await obtenerPerfilesFleteros(ofertas.map(o => o.fletero_id));

  // 2. Obtener datos del viaje
  const viaje = await obtenerViajeMarketplace(ofertas[0].HDR_viaje);

  // 3. Calcular score para cada oferta
  const scores = ofertas.map(oferta => {
    const fletero = fleterosData.find(f => f.fletero_id === oferta.fletero_id);
    const score = calcularScore(oferta, viaje, fletero);

    return {
      id_oferta: oferta.id_oferta,
      fletero_nombre: oferta.fletero_nombre,
      score_final: score,
      es_recomendada: false // Se marcará después
    };
  });

  // 4. Marcar la mejor oferta como recomendada
  const mejorOferta = scores.reduce((prev, current) =>
    current.score_final > prev.score_final ? current : prev
  );
  mejorOferta.es_recomendada = true;

  return scores;
}
```

---

## 🔐 Zustand Store

**Ubicación:** `src/stores/marketplaceStore.ts`

**Nuevo estado:**
```typescript
interface MarketplaceState {
  // ... estado existente de viajes ...

  // Ofertas
  ofertas: OfertaMarketplace[];
  scoresCalculados: FleteroScore[];

  // Actions
  cargarOfertasDeViaje: (HDR_viaje: string) => Promise<void>;
  crearOferta: (oferta: Partial<OfertaMarketplace>) => Promise<string>;
  aceptarOferta: (id_oferta: string) => Promise<void>;
  rechazarOferta: (id_oferta: string, motivo: string) => Promise<void>;
  calcularRecomendacion: () => Promise<void>;
}
```

**Implementación:**
```typescript
export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ofertas: [],
  scoresCalculados: [],

  cargarOfertasDeViaje: async (HDR_viaje: string) => {
    set({ loading: true });
    try {
      const ofertas = await obtenerOfertasDeViaje(HDR_viaje);
      set({ ofertas, loading: false });

      // Auto-calcular scores
      if (ofertas.length > 0) {
        await get().calcularRecomendacion();
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  crearOferta: async (oferta: Partial<OfertaMarketplace>) => {
    set({ loading: true });
    try {
      const id_oferta = await crearOfertaMarketplace(oferta);
      set({ loading: false });
      return id_oferta;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  aceptarOferta: async (id_oferta: string) => {
    set({ loading: true });
    try {
      // 1. Actualizar oferta a ACEPTADA
      await actualizarEstadoOferta(id_oferta, 'ACEPTADA');

      // 2. Rechazar todas las demás ofertas del mismo viaje
      const { ofertas } = get();
      const ofertasRechazar = ofertas.filter(o => o.id_oferta !== id_oferta);
      await Promise.all(
        ofertasRechazar.map(o =>
          actualizarEstadoOferta(o.id_oferta, 'RECHAZADA', 'Otra oferta fue aceptada')
        )
      );

      // 3. Actualizar viaje a ASIGNADO
      const oferta = ofertas.find(o => o.id_oferta === id_oferta);
      await actualizarViajeMarketplace(oferta!.HDR_viaje, {
        estado: 'ASIGNADO',
        fletero_asignado: oferta!.fletero_nombre,
        precio_final: oferta!.precio_ofertado,
        fecha_asignacion: new Date().toISOString()
      });

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  rechazarOferta: async (id_oferta: string, motivo: string) => {
    set({ loading: true });
    try {
      await actualizarEstadoOferta(id_oferta, 'RECHAZADA', motivo);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  calcularRecomendacion: async () => {
    const { ofertas } = get();
    if (ofertas.length === 0) return;

    try {
      const scores = await calcularScoreOfertas(ofertas);
      set({ scoresCalculados: scores });
    } catch (error) {
      console.error('Error al calcular scores:', error);
    }
  }
}));
```

---

## 📝 Google Apps Script Functions

**Agregar en `Code.gs`:**

### CREATE_MARKETPLACE_OFERTA
```javascript
function createMarketplaceOferta(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Ofertas');
    if (!sheet) {
      throw new Error('Hoja Marketplace_Ofertas no encontrada');
    }

    const data = requestData.data;
    const rowData = [
      data.id_oferta,                  // A: id_oferta
      data.HDR_viaje,                  // B: HDR_viaje
      data.fletero_nombre,             // C: fletero_nombre
      data.fletero_id,                 // D: fletero_id
      data.precio_ofertado,            // E: precio_ofertado
      data.unidad_ofrecida,            // F: unidad_ofrecida
      data.patente_unidad,             // G: patente_unidad
      data.chofer_asignado,            // H: chofer_asignado
      data.telefono_chofer,            // I: telefono_chofer
      data.tiempo_estimado_horas,      // J: tiempo_estimado_horas
      data.mensaje_adicional || '',    // K: mensaje_adicional
      data.fecha_oferta,               // L: fecha_oferta
      'PENDIENTE',                     // M: estado
      0,                               // N: score_algoritmo (se calcula después)
      '',                              // O: fecha_respuesta
      ''                               // P: motivo_rechazo
    ];

    sheet.appendRow(rowData);

    // Actualizar contador en viaje
    incrementarContadorOfertas(ss, data.HDR_viaje);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Oferta creada exitosamente',
      data: { id_oferta: data.id_oferta }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al crear oferta: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function incrementarContadorOfertas(ss, HDR_viaje) {
  const sheet = ss.getSheetByName('Marketplace_Viajes');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === HDR_viaje) {
      const rowIndex = i + 1;
      const currentCount = sheet.getRange(rowIndex, 13).getValue() || 0; // Columna M
      sheet.getRange(rowIndex, 13).setValue(currentCount + 1);
      break;
    }
  }
}
```

---

## 🎨 UI/UX Recomendaciones

### Colores de Estado de Oferta
```typescript
const getEstadoOfertaColor = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
    case 'ACEPTADA': return 'bg-green-100 text-green-800';
    case 'RECHAZADA': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

### Badges de Score
```tsx
<div className={`score-badge ${score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'}`}>
  {score}/100
</div>
```

---

## ✅ Checklist de Implementación

### Backend (Google Sheets + Apps Script)
- [ ] Crear hoja `Marketplace_Ofertas`
- [ ] Crear hoja `Fleteros_Perfil`
- [ ] Agregar columnas a `Marketplace_Viajes`: `total_ofertas`, `mejor_precio_oferta`, `tiempo_limite_oferta`
- [ ] Implementar función `CREATE_MARKETPLACE_OFERTA` en Apps Script
- [ ] Implementar función `UPDATE_MARKETPLACE_OFERTA` en Apps Script
- [ ] Implementar función `incrementarContadorOfertas`
- [ ] Desplegar nueva versión de Apps Script

### Frontend - API
- [ ] Crear `src/utils/scoringSystem.ts`
- [ ] Agregar funciones en `src/utils/marketplaceApi.ts`:
  - [ ] `crearOfertaMarketplace()`
  - [ ] `obtenerOfertasDeViaje()`
  - [ ] `actualizarEstadoOferta()`
  - [ ] `calcularScoreOfertas()`
  - [ ] `obtenerPerfilesFleteros()`

### Frontend - Store
- [ ] Actualizar `src/stores/marketplaceStore.ts`:
  - [ ] Agregar estado `ofertas` y `scoresCalculados`
  - [ ] Implementar `cargarOfertasDeViaje()`
  - [ ] Implementar `crearOferta()`
  - [ ] Implementar `aceptarOferta()`
  - [ ] Implementar `rechazarOferta()`
  - [ ] Implementar `calcularRecomendacion()`

### Frontend - Componentes
- [ ] Crear `src/components/marketplace/OfertasSection.tsx` (vista fletero)
- [ ] Crear `src/components/marketplace/OfertaModal.tsx` (formulario)
- [ ] Crear `src/components/marketplace/OfertasDetail.tsx` (vista admin)
- [ ] Crear `src/components/marketplace/OfertaCard.tsx` (card individual)
- [ ] Actualizar `MarketplaceSection.tsx` para incluir botón "Ver Ofertas"

### Testing
- [ ] Probar creación de oferta como fletero
- [ ] Probar cálculo de scores
- [ ] Probar aceptar/rechazar ofertas
- [ ] Probar asignación de viaje
- [ ] Verificar actualización de contadores
- [ ] Probar en móvil Android

### Documentación
- [ ] Actualizar README.md con sistema de ofertas
- [ ] Crear guía de uso para fleteros
- [ ] Documentar fórmula de scoring

---

## 🚀 Orden de Implementación Recomendado

### Fase 1: Backend (1-2 días)
1. Crear hojas en Google Sheets
2. Implementar funciones en Apps Script
3. Probar con Postman/Thunder Client

### Fase 2: API y Store (1 día)
1. Crear funciones en `marketplaceApi.ts`
2. Implementar sistema de scoring
3. Actualizar `marketplaceStore.ts`

### Fase 3: UI Fletero (2 días)
1. Crear `OfertasSection.tsx`
2. Crear `OfertaModal.tsx`
3. Integrar con autenticación de fleteros
4. Testing en móvil

### Fase 4: UI Admin (2 días)
1. Crear `OfertasDetail.tsx`
2. Implementar aceptar/rechazar
3. Mostrar recomendaciones
4. Testing completo

### Fase 5: Refinamiento (1 día)
1. Optimizar animaciones
2. Mejorar UX en móvil
3. Agregar notificaciones
4. Documentación final

---

## 💡 Mejoras Futuras

- **Notificaciones Push:** Avisar a fleteros cuando hay nuevos viajes
- **Chat en tiempo real:** Negociar precio directamente
- **Historial de ofertas:** Ver ofertas pasadas y aprender
- **Sistema de reputación:** Badges y niveles para fleteros
- **Ofertas automáticas:** Fleteros configuran precio mínimo y el sistema oferta automáticamente
- **Analytics:** Dashboard con métricas de ofertas, conversión, precios promedio

---

**Tiempo estimado total:** 6-8 días de desarrollo

**Prioridad:** Alta - Es el core del marketplace

**Dependencias:** Google Apps Script actualizado, autenticación de fleteros funcionando
