# 📋 RESUMEN EJECUTIVO - IMPLEMENTACIÓN SISTEMA DE OFERTAS

## ✅ Estado Actual

### **Google Sheets - YA CREADO**
- ✅ Marketplace_Viajes (20 columnas)
- ✅ Marketplace_Ofertas (16 columnas)
- ✅ Marketplace_Ratings (14 columnas)
- ✅ Fleteros_Perfil (18 columnas)

### **Frontend - COMPLETADO**
- ✅ Creación de viajes
- ✅ Visualización de viajes con animación
- ✅ Validación de HDR duplicados
- ✅ Eliminar viajes
- ✅ Auto-carga de ubicaciones
- ✅ Diseño responsive Android

---

## 🎯 Próximos Pasos - Sistema de Ofertas

### **Fase 1: Backend Google Apps Script** (1 día)

**Agregar en `Code.gs`:**

1. **CREATE_MARKETPLACE_OFERTA** - Crear nueva oferta
```javascript
case 'CREATE_MARKETPLACE_OFERTA':
  return createMarketplaceOferta(ss, data);
```

2. **UPDATE_MARKETPLACE_OFERTA** - Actualizar estado
```javascript
case 'UPDATE_MARKETPLACE_OFERTA':
  return updateMarketplaceOferta(ss, data);
```

3. **GET_OFERTAS_VIAJE** - Obtener ofertas de un viaje
```javascript
case 'GET_OFERTAS_VIAJE':
  return getOfertasViaje(ss, data);
```

4. **GET_FLETERO_PERFIL** - Obtener perfil de fletero
```javascript
case 'GET_FLETERO_PERFIL':
  return getFleteroPerfilem(ss, data);
```

5. **UPDATE_SCORE_OFERTA** - Actualizar score calculado
```javascript
case 'UPDATE_SCORE_OFERTA':
  return updateScoreOferta(ss, data);
```

**Testing:** Postman o Thunder Client

---

### **Fase 2: API y Utilities** (1 día)

**1. Actualizar interfaces TypeScript** ✅ HECHO
- `OfertaMarketplace` (16 campos)
- `FleteroPerfilMarketplace` (18 campos)
- `RatingMarketplace` (14 campos)

**2. Crear `src/utils/scoringSystem.ts`**
```typescript
export function calcularScore(
  oferta: OfertaMarketplace,
  viaje: ViajeMarketplace,
  fletero: FleteroPerfilMarketplace
): number
```

Fórmula:
- Precio (40%)
- Rating (30%)
- Tiempo estimado (15%)
- Historial completados (15%)
- Penalización por cancelados (-2 puntos por cancelación)

**3. Agregar en `src/utils/marketplaceApi.ts`**
```typescript
// Ofertas
export async function crearOfertaMarketplace(oferta): Promise<string>
export async function obtenerOfertasDeViaje(HDR_viaje): Promise<OfertaMarketplace[]>
export async function actualizarEstadoOferta(id_oferta, estado): Promise<void>

// Fleteros
export async function obtenerPerfilFletero(fletero_id): Promise<FleteroPerfilMarketplace>
export async function obtenerPerfilesFleteros(ids): Promise<FleteroPerfilMarketplace[]>

// Scoring
export async function calcularScoreOfertas(ofertas): Promise<FleteroScore[]>
export async function actualizarScoreOferta(id_oferta, score): Promise<void>
```

---

### **Fase 3: Zustand Store** (½ día)

**Actualizar `src/stores/marketplaceStore.ts`:**

```typescript
interface MarketplaceState {
  // Existente
  viajes: ViajeMarketplace[];
  viajeActual: ViajeMarketplace | null;

  // NUEVO
  ofertas: OfertaMarketplace[];
  scoresCalculados: FleteroScore[];
  fleterosPerfiles: Map<string, FleteroPerfilMarketplace>;

  // Actions NUEVAS
  cargarOfertasDeViaje: (HDR_viaje: string) => Promise<void>;
  crearOferta: (oferta: Partial<OfertaMarketplace>) => Promise<string>;
  aceptarOferta: (id_oferta: string) => Promise<void>;
  rechazarOferta: (id_oferta: string, motivo: string) => Promise<void>;
  calcularRecomendacion: () => Promise<void>;
  cargarPerfilFletero: (fletero_id: string) => Promise<void>;
}
```

**Funcionalidad `aceptarOferta`:**
1. Actualizar oferta a ACEPTADA
2. Rechazar todas las demás ofertas del viaje
3. Actualizar viaje a ASIGNADO
4. Guardar fletero y precio final en viaje

---

### **Fase 4: Componentes UI Fletero** (2 días)

#### **4.1 ViajesDisponiblesSection.tsx**
Vista para fleteros con viajes PUBLICADOS disponibles.

```tsx
<ViajesDisponiblesSection>
  {/* Filtros */}
  <Filtros>
    - Por fecha
    - Por tipo de carga
    - Por zona (usando radio_operativo_km del fletero)
  </Filtros>

  {/* Lista de viajes */}
  {viajes.map(viaje => (
    <ViajeDisponibleCard
      viaje={viaje}
      onOfertar={() => openOfertaModal(viaje)}
      yaOferto={hasUserOffered(viaje)}
      tiempoRestante={calcularTiempoRestante(viaje.tiempo_limite_oferta)}
    />
  ))}
</ViajesDisponiblesSection>
```

**Información en cada card:**
- Cliente, Fecha, HDR
- Precio base sugerido
- Tipo de unidad requerida
- Peso
- Ruta (cargas y descargas)
- Tiempo límite para ofertar
- Total de ofertas recibidas
- Indicador si ya ofertó

#### **4.2 OfertaModal.tsx**
Formulario para crear oferta.

**Campos:**
```tsx
{
  precio_ofertado: number;           // Input numérico
  unidad_ofrecida: string;           // Select de tipos_unidades del fletero
  patente_unidad: string;            // Input texto
  chofer_asignado: string;           // Input texto
  telefono_chofer: string;           // Input tel
  tiempo_estimado_horas: number;     // Input numérico
  mensaje_adicional: string;         // Textarea
}
```

**Validaciones:**
- Precio > 0
- Todos los campos obligatorios
- Verificar que no haya ofertado antes en este viaje
- Verificar que viaje esté en estado PUBLICADO
- Verificar que no pasó tiempo_limite_oferta

**Al enviar:**
1. Crear oferta con estado PENDIENTE
2. Incrementar contador en viaje
3. Notificar éxito
4. Cerrar modal
5. Actualizar lista (marcar como "Ya ofertaste")

#### **4.3 MisOfertasSection.tsx**
Ver ofertas del fletero logueado.

**Tabs:**
- PENDIENTES (amarillo)
- ACEPTADAS (verde)
- RECHAZADAS (rojo)

**Información por oferta:**
- Viaje: Cliente, HDR, Fecha
- Tu oferta: Precio, Unidad, Chofer
- Estado con color
- Si RECHAZADA: motivo
- Si ACEPTADA: botón "Ver detalles del viaje"

---

### **Fase 5: Componentes UI Admin Crosslog** (2 días)

#### **5.1 Actualizar ViajeCard.tsx**
Agregar botón "Ver Ofertas" cuando `total_ofertas > 0`.

```tsx
{viaje.total_ofertas > 0 && (
  <button onClick={() => onVerOfertas(viaje)}>
    Ver {viaje.total_ofertas} ofertas
  </button>
)}
```

#### **5.2 OfertasDetailModal.tsx**
Modal que muestra todas las ofertas de un viaje.

**Secciones:**

**A. Header**
```tsx
<Header>
  <h2>Ofertas para {viaje.cliente_nombre} - {viaje.hdr_generado}</h2>
  <Stats>
    <p>Total ofertas: {ofertas.length}</p>
    <p>Rango precios: ${min} - ${max}</p>
    <p>Promedio: ${avg}</p>
  </Stats>
</Header>
```

**B. Oferta Recomendada**
```tsx
{ofertaRecomendada && (
  <OfertaRecomendada>
    <Badge>⭐ RECOMENDADA - Score: {score}/100</Badge>
    <OfertaCard
      oferta={ofertaRecomendada}
      fletero={fleterosPerfil.get(oferta.fletero_id)}
      destacada={true}
      onAceptar={handleAceptar}
      onRechazar={handleRechazar}
    />
  </OfertaRecomendada>
)}
```

**C. Otras Ofertas (ordenadas por score)**
```tsx
{otrasOfertas.map(oferta => (
  <OfertaCard
    key={oferta.id_oferta}
    oferta={oferta}
    fletero={fleterosPerfil.get(oferta.fletero_id)}
    score={scores.find(s => s.id_oferta === oferta.id_oferta)?.score}
    onAceptar={handleAceptar}
    onRechazar={handleRechazar}
  />
))}
```

#### **5.3 OfertaCard.tsx**
Card individual de oferta con toda la información.

**Información mostrada:**
```tsx
<OfertaCard>
  {/* Header con score */}
  <Header destacada={destacada}>
    <h3>{fletero.nombre_fletero}</h3>
    <ScoreBadge score={score} />
  </Header>

  {/* Detalles de la oferta */}
  <Detalles>
    <p>💰 Precio: ${precio_ofertado}</p>
    <p>🚛 {unidad_ofrecida} - {patente_unidad}</p>
    <p>👤 Chofer: {chofer_asignado}</p>
    <p>📞 {telefono_chofer}</p>
    <p>⏱️ Tiempo estimado: {tiempo_estimado_horas}h</p>
    <p>📝 {mensaje_adicional}</p>
  </Detalles>

  {/* Perfil del fletero */}
  <PerfilFletero>
    <p>🏢 {razon_social}</p>
    <p>⭐ Rating: {rating_promedio}/5</p>
    <p>📦 Completados: {total_viajes_completados}</p>
    <p>❌ Cancelados: {total_viajes_cancelados}</p>
    <p>🚛 Unidades: {unidades_disponibles}</p>
    <p>📍 Radio: {radio_operativo_km}km</p>
    <p>🗺️ Zonas: {zonas_operativas}</p>
  </PerfilFletero>

  {/* Acciones */}
  <Acciones>
    <button onClick={onAceptar} className="aceptar">
      ✅ Aceptar Oferta
    </button>
    <button onClick={onRechazar} className="rechazar">
      ❌ Rechazar
    </button>
  </Acciones>
</OfertaCard>
```

**Al aceptar:**
1. Confirmar con usuario
2. Actualizar oferta a ACEPTADA
3. Rechazar todas las demás automáticamente
4. Cambiar viaje a ASIGNADO
5. Guardar fletero_asignado y precio_final
6. Mostrar confirmación
7. Cerrar modal

**Al rechazar:**
1. Pedir motivo (input)
2. Actualizar oferta a RECHAZADA con motivo
3. Actualizar lista

---

### **Fase 6: Sistema de Ratings** (1 día - FUTURO)

Después de que un viaje se complete (estado COMPLETADO), permitir calificar al fletero.

**Formulario:**
- Rating puntualidad (1-5)
- Rating calidad (1-5)
- Rating documentación (1-5)
- Rating comunicación (1-5)
- Comentarios
- ¿Completado a tiempo? SI/NO
- Incidencias

**Al guardar:**
1. Crear registro en Marketplace_Ratings
2. Actualizar rating_promedio en Fleteros_Perfil
3. Incrementar total_viajes_completados

---

## 📊 Testing Checklist

### Backend
- [ ] Crear oferta vía Apps Script
- [ ] Obtener ofertas de un viaje
- [ ] Actualizar estado de oferta
- [ ] Incrementar contador en viaje
- [ ] Obtener perfil de fletero
- [ ] Actualizar score de oferta

### Frontend - Fletero
- [ ] Ver lista de viajes disponibles
- [ ] Filtrar viajes por fecha/zona/tipo
- [ ] Crear oferta en un viaje
- [ ] Validación: no ofertar dos veces
- [ ] Ver mis ofertas (tabs por estado)
- [ ] Ver detalle de oferta aceptada

### Frontend - Admin
- [ ] Ver contador de ofertas en viaje
- [ ] Abrir modal de ofertas
- [ ] Ver oferta recomendada destacada
- [ ] Ver todas las ofertas ordenadas
- [ ] Calcular scores correctamente
- [ ] Aceptar oferta
- [ ] Rechazar oferta con motivo
- [ ] Verificar que viaje cambia a ASIGNADO

### Integración
- [ ] Fletero oferta → Admin ve oferta
- [ ] Admin acepta → Fletero ve ACEPTADA
- [ ] Admin rechaza → Fletero ve motivo
- [ ] Viaje asignado muestra fletero correcto
- [ ] Precio final se guarda
- [ ] Testing en móvil Android

---

## 🚀 Orden de Ejecución

### Día 1: Backend
1. Implementar funciones en Google Apps Script
2. Probar con Postman
3. Verificar columnas en Sheets

### Día 2: API + Store
1. Crear scoringSystem.ts
2. Agregar funciones en marketplaceApi.ts
3. Actualizar marketplaceStore.ts
4. Testing de integración

### Día 3-4: UI Fletero
1. ViajesDisponiblesSection.tsx
2. OfertaModal.tsx
3. MisOfertasSection.tsx
4. Testing móvil

### Día 5-6: UI Admin
1. Actualizar ViajeCard
2. OfertasDetailModal.tsx
3. OfertaCard.tsx
4. Testing completo

### Día 7: Testing Final
1. Flujo completo end-to-end
2. Ajustes de UX
3. Optimización móvil
4. Documentación

---

## 🎯 Métricas de Éxito

- ✅ Fletero puede ofertar en < 2 minutos
- ✅ Admin ve oferta recomendada correcta
- ✅ Score se calcula automáticamente
- ✅ Proceso de aceptar oferta < 1 minuto
- ✅ UI responsive funciona en Android
- ✅ 0 errores en producción primera semana

---

## 💡 Mejoras Futuras

- [ ] Notificaciones push cuando hay nuevas ofertas
- [ ] Chat en tiempo real para negociar
- [ ] Ofertas automáticas (fletero configura precio mínimo)
- [ ] Sistema de badges para fleteros destacados
- [ ] Analytics de ofertas (conversión, precios promedio)
- [ ] Exportar ofertas a Excel

---

**Tiempo total estimado: 6-7 días**

**Próximo paso:** Implementar Fase 1 (Backend Google Apps Script)
