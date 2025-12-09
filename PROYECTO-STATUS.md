# 📊 ESTADO DEL PROYECTO CROSSLOG PWA
**Última actualización:** 24 de Noviembre de 2024

---

## ✅ AVANCES COMPLETADOS

### 🎯 **FASE 1: Mejoras de Análisis IA y Reportes (COMPLETADO)**

#### **1.1 Corrección de Datos y Filtros**
- ✅ Implementado formato de fecha unificado (YYYY-MM) en todo el sistema
- ✅ Corregida función `formatMonthName` para soportar ambos formatos (YYYY-MM y MM-YYYY)
- ✅ Filtrado automático por mes/año en curso (sin usar filtros de dashboard)
- ✅ Validación de viajes: solo cuenta registros con valores válidos en columna H
- ✅ **Total viajes ahora coincide exactamente con CROSSLOG + FLETEROS**

**Archivos modificados:**
- `src/utils/reportData.ts` (línea 43)
- `src/utils/sheetsApi.ts` (líneas 1876-1951)

#### **1.2 Mejora de Análisis con Claude AI**
- ✅ Integrado contexto completo de negocio en prompt de Claude:
  - Choferes propios (Oscar Gomez, Martin Romero, etc.)
  - Flota CROSSLOG detallada (1 Semi, 2 Balancines, 3 Chasis, 1 F100)
  - Mapeo de clientes (ECO = Ecolab, TOY = Toyota, etc.)
  - Información de contratos (Oxynet finalizado en Octubre)
  - Tipos de viaje (LOC/INT)
- ✅ Cálculo de días restantes en mes actual para análisis parcial
- ✅ Análisis de capacidad instalada vs demanda por tipo de unidad
- ✅ Alertas y recomendaciones específicas y accionables

**Archivos modificados:**
- `src/utils/claudeAnalysis.ts` (líneas 86-186)

#### **1.3 Interfaz de Usuario - Reporte IA**
- ✅ Título del período con meses analizados (chips visuales)
- ✅ Resumen Ejecutivo con diseño mejorado (gradiente azul)
- ✅ Clientes Estrella con diseño amber/gold
- ✅ Análisis de Flota con diseño índigo
- ✅ Alertas con diseño rojo (cards individuales numeradas)
- ✅ Recomendaciones con diseño verde esmeralda (cards individuales)
- ✅ Efectos glass-morphism y decorativos en todos los cards
- ✅ Iconos grandes (w-12 h-12) con gradientes
- ✅ Círculos decorativos en esquinas
- ✅ Sombras y hover effects profesionales

**Archivos modificados:**
- `src/components/Indicadores.tsx` (líneas 851-987)

#### **1.4 Sistema de Recursos - ConsultaInterna**
- ✅ Nueva pestaña "Recursos" (cuarto botón de navegación)
- ✅ Grid responsive (2 columnas en móvil, 4 en desktop)
- ✅ Sección Manual de Choferes:
  - Botón "Descargar PDF"
  - Botón "Visualizar" (nueva pestaña)
  - Diseño con gradiente azul/índigo
  - Descripción completa del manual
- ✅ Sección Panel Administrativo (placeholder "Próximamente")
- ✅ PDF del manual copiado a carpeta `public/`

**Archivos modificados:**
- `src/components/ConsultaInterna.tsx` (líneas 37, 284-426)
- `public/CROSSLOG - Manual Choferes.pdf` (agregado)

---

## 🚀 PRÓXIMAS FASES - PLANIFICADAS PARA IMPLEMENTACIÓN

### 📱 **FASE 2: Sistema de Gestión Documental para Choferes (PRÓXIMA SEMANA)**

#### **Objetivo General:**
Convertir la PWA en una "Billetera Digital" para choferes propios con acceso inmediato a toda su documentación y la de su unidad, con alertas automáticas de vencimientos.

---

### **2.1 Infraestructura de Datos (Día 1-2)**

#### **A. Crear Hojas en Google Sheets:**

**Hoja: "Choferes_Docs"**
```
Columnas:
- A: Nombre_Chofer (Oscar Gomez, Martin Romero, etc.)
- B: DNI
- C: Registro_DriveID (ID de Google Drive)
- D: Registro_FechaVenc (formato YYYY-MM-DD)
- E: Lintin_DriveID
- F: Lintin_FechaVenc
- G: DNI_DriveID
- H: Estado_General (VIGENTE/ALERTA/VENCIDO)
- I: Ultima_Actualizacion
```

**Hoja: "Unidades_Docs"**
```
Columnas:
- A: Numero_Unidad (41, 45, 46, 62, 63, 64, 813, 816, 817)
- B: Tipo (Semi, Balancín, Chasis, F100)
- C: Patente
- D: Seguro_DriveID
- E: Seguro_FechaVenc
- F: VTV_DriveID
- G: VTV_FechaVenc
- H: Cedula_DriveID
- I: Cedula_FechaVenc
- J: Estado_General
- K: Ultima_Actualizacion
```

**Hoja: "Cuadernillos"**
```
Columnas:
- A: Mes (formato YYYY-MM)
- B: Cuadernillo_Completo_DriveID
- C: 931_DriveID
- D: ART_DriveID
- E: Clausula_NoRepeticion_DriveID
- F: Fecha_Emision
- G: Fecha_Vencimiento (último día del mes)
- H: Estado (VIGENTE/VENCIDO)
```

#### **B. Estructura de Google Drive:**

```
📁 CROSSLOG Documentación/
  ├── 📁 Choferes/
  │   ├── 📁 Oscar_Gomez/
  │   │   ├── Registro_Oscar_2024.pdf
  │   │   ├── Lintin_Oscar_2024.pdf
  │   │   └── DNI_Oscar.pdf
  │   ├── 📁 Martin_Romero/
  │   └── 📁 Jonathan_Esteban/
  │       └── ... (documentos)
  ├── 📁 Unidades/
  │   ├── 📁 Unidad_45/
  │   │   ├── Seguro_45_2024.pdf
  │   │   ├── VTV_45_2024.pdf
  │   │   └── Cedula_45.pdf
  │   ├── 📁 Unidad_62/
  │   └── 📁 Unidad_816/
  └── 📁 Cuadernillos/
      ├── 2024-11-Cuadernillo.pdf
      ├── 2024-12-Cuadernillo.pdf
      └── 2025-01-Cuadernillo.pdf
```

**Permisos:** Lectura para todos (sin restricciones por chofer)

---

### **2.2 Componentes y Servicios (Día 3-4)**

#### **Nuevos Archivos a Crear:**

**A. Tipos (src/types/documentos.ts):**
```typescript
export interface DocumentoChofer {
  tipo: 'registro' | 'lintin' | 'dni';
  nombre: string;
  driveId: string;
  fechaVencimiento?: string;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
}

export interface DocumentoUnidad {
  tipo: 'seguro' | 'vtv' | 'cedula';
  nombre: string;
  driveId: string;
  fechaVencimiento: string;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
}

export interface Cuadernillo {
  mes: string;
  cuadernilloCompleto: string; // Drive ID
  doc931?: string;
  docART?: string;
  clausulaNoRepeticion?: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: 'VIGENTE' | 'VENCIDO';
}

export interface Alerta {
  tipo: 'documento' | 'cuadernillo';
  mensaje: string;
  criticidad: 'alta' | 'media' | 'baja';
  diasRestantes: number;
}
```

**B. API de Documentos (src/utils/documentosApi.ts):**
```typescript
export class DocumentosAPI {
  // Obtener documentos del chofer por nombre
  async getDocumentosChofer(nombre: string): Promise<DocumentoChofer[]>

  // Obtener documentos de la unidad por número
  async getDocumentosUnidad(numero: string): Promise<DocumentoUnidad[]>

  // Obtener cuadernillo del mes (detecta mes actual automáticamente)
  async getCuadernilloMes(mes?: string): Promise<Cuadernillo>

  // Verificar vencimientos y generar alertas
  async verificarVencimientos(chofer: string, unidad: string): Promise<Alerta[]>

  // Generar URL de descarga desde Drive ID
  getDriveDownloadUrl(driveId: string): string

  // Generar URL de visualización desde Drive ID
  getDriveViewUrl(driveId: string): string
}
```

**C. Store de Documentos (src/stores/documentosStore.ts):**
```typescript
interface DocumentosState {
  choferId: string | null;
  unidadId: string | null;
  documentosChofer: DocumentoChofer[];
  documentosUnidad: DocumentoUnidad[];
  cuadernillo: Cuadernillo | null;
  alertas: Alerta[];
  loading: boolean;

  cargarDocumentos: (chofer: string, unidad: string) => Promise<void>;
  descargarDocumento: (driveId: string, nombre: string) => void;
  limpiar: () => void;
}
```

**D. Utilidades de Vencimientos (src/utils/vencimientosUtils.ts):**
```typescript
// Calcular estado según fecha de vencimiento
export function calcularEstadoDocumento(fechaVenc: string): 'VIGENTE' | 'POR_VENCER' | 'VENCIDO'

// Calcular días hasta vencimiento
export function diasHastaVencimiento(fechaVenc: string): number

// Generar alertas de múltiples documentos
export function generarAlertas(documentos: any[]): Alerta[]

// Formatear fecha para mostrar
export function formatearFecha(fecha: string): string
```

**E. Componentes de UI:**

**DocumentCard.tsx:**
```typescript
interface DocumentCardProps {
  tipo: string;
  nombre: string;
  fechaVencimiento?: string;
  driveId: string;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
}
// Card reutilizable con badge de estado, botones Ver/Descargar
```

**DocumentosChofer.tsx:**
```typescript
// Vista completa de documentos del chofer
// - Header con nombre y foto
// - Lista de documentos (Registro, Lintín, DNI)
// - Alertas de vencimiento
```

**CuadernilloViewer.tsx:**
```typescript
// Vista del cuadernillo mensual
// - Detección automática de mes actual
// - Card con estado y fecha de vencimiento
// - Botones para descargar docs individuales (931, ART, Cláusula)
// - Botón para descargar paquete completo
```

**DocumentosModal.tsx:** (NUEVO)
```typescript
// Modal emergente con tabs:
// - Tab 1: Cuadernillo Mensual
// - Tab 2: Tu Documentación (chofer)
// - Tab 3: Documentación Unidad
// - Botón cerrar [X]
// - Fondo semi-transparente
```

---

### **2.3 Integración en Flujo de Usuario (Día 5-6)**

#### **A. Modificar Login.tsx:**
```typescript
// Al validar HDR:
1. Detectar si chofer es PROPIO o FLETERO
2. Si PROPIO:
   - Extraer nombre del chofer
   - Extraer número de unidad
   - Cargar documentos en store
   - Verificar vencimientos
3. Guardar en store global
```

#### **B. Modificar WelcomeModal.tsx:**
```typescript
// Agregar nueva sección:
📋 DOCUMENTACIÓN DISPONIBLE
✅ Control centralizado de tu documentación

[Ver Documentación Completa]  ← Botón que abre DocumentosModal
```

#### **C. Modificar EntregasList.tsx:**
```typescript
// Header actualizado:
┌─────────────────────────────────────────┐
│ HDR: 15553                              │
│ Chofer: Jonathan Esteban                │
│ Fecha: 25-11-2024                       │
│                                         │
│ [📄 VER DOCUMENTACIÓN] ← NUEVO BOTÓN    │
│   (con badge de alertas si hay)        │
│                                         │
│ COMPLETADAS: 0 DE 4                     │
│ RESTAN: 4 ENTREGAS PENDIENTES           │
└─────────────────────────────────────────┘

// Al presionar botón:
- Abrir DocumentosModal (modal emergente)
- Mostrar tabs con documentación
- Permitir descargar/visualizar
```

#### **D. Opcional: Modificar DetalleViaje.tsx:**
```typescript
// Agregar sección al final del formulario:
📋 DOCUMENTACIÓN DEL VIAJE

📦 Cuadernillo Mensual
Estado: ✅ VIGENTE
Vence: 30/11/2024
[Descargar] [Ver]

👤 Acceso Rápido: [Ver Toda Mi Documentación]
```

---

### **2.4 Panel Administrativo (Día 7)**

#### **Agregar en ConsultaInterna → Recursos:**

**Vista Administrativa de Documentos:**
```typescript
// Tabla con todos los choferes
┌──────────────┬────────────┬──────────┬─────────────┐
│ Chofer       │ Registro   │ Lintín   │ Estado      │
├──────────────┼────────────┼──────────┼─────────────┤
│ Oscar Gomez  │ ✅ Vigente │ ✅ Vigente│ OK          │
│ Jonathan E.  │ ⚠️ 15 días│ ✅ Vigente│ ALERTA      │
└──────────────┴────────────┴──────────┴─────────────┘

// Tabla con todas las unidades
┌────────┬─────────┬──────────┬───────────┬─────────┐
│ Unidad │ Tipo    │ Seguro   │ VTV       │ Estado  │
├────────┼─────────┼──────────┼───────────┼─────────┤
│ 45     │ Semi    │ ✅ Vigente│ ⚠️ 15 días│ ALERTA  │
│ 62     │ Chasis  │ ✅ Vigente│ ✅ Vigente │ OK      │
└────────┴─────────┴──────────┴───────────┴─────────┘

// Botones:
[+ Agregar Chofer]
[+ Agregar Unidad]
[Subir Documentos]
[Actualizar Cuadernillo]
```

**Formulario de Carga de Documentos:**
```typescript
// Modal para subir archivos:
1. Seleccionar tipo (Chofer/Unidad/Cuadernillo)
2. Seleccionar nombre/número
3. Seleccionar documento específico
4. Upload a Google Drive
5. Actualizar Google Sheets con Drive ID
```

---

## 📅 CRONOGRAMA DETALLADO - FASE 2

### **Semana 1 (25 Nov - 1 Dic)**

| Día | Tarea | Tiempo Estimado |
|-----|-------|----------------|
| **Lunes** | Crear estructura Google Drive + Hojas Sheets | 3 horas |
| **Martes** | Cargar datos de prueba + Crear tipos TypeScript | 3 horas |
| **Miércoles** | Implementar `documentosApi.ts` + `documentosStore.ts` | 4 horas |
| **Jueves** | Crear componentes base (DocumentCard, DocumentosChofer, CuadernilloViewer) | 4 horas |
| **Viernes** | Crear DocumentosModal + Integrar en Login/WelcomeModal | 4 horas |
| **Sábado** | Integrar en EntregasList + Testing | 3 horas |
| **Domingo** | Panel administrativo + Ajustes finales | 3 horas |

**Total:** ~24 horas de desarrollo

---

## 🎯 BENEFICIOS ESPERADOS - FASE 2

### **Para Choferes:**
- ✅ Acceso inmediato a documentación sin llamar a oficina
- ✅ Alertas proactivas de vencimientos (7-30 días antes)
- ✅ Menos papel en cabina (todo digital)
- ✅ Cuadernillo siempre actualizado
- ✅ Autonomía y confianza

### **Para CROSSLOG:**
- ✅ Control centralizado de documentación
- ✅ Alertas automáticas para renovaciones
- ✅ Reducción de llamadas "¿tengo el cuadernillo actualizado?"
- ✅ Cumplimiento normativo garantizado
- ✅ Trazabilidad de accesos

### **Para Clientes (Toyota, Ecolab):**
- ✅ Garantía de documentación vigente en campo
- ✅ Cumplimiento de requisitos de plataforma
- ✅ Mayor profesionalismo

---

## 🔮 FUNCIONALIDADES FUTURAS - FASE 3 (Post-Diciembre)

### **3.1 Notificaciones Push**
- Avisar 7 días antes de vencimientos
- Notificación cuando nuevo cuadernillo disponible
- Alertas de documentación faltante

### **3.2 Firma Digital**
- Acuse de recibo de cuadernillo mensual
- Firma de conformidad en documentos
- Registro de capacitaciones

### **3.3 Historial y Trazabilidad**
- Registro de consultas a documentos
- Log de descargas por chofer
- Reporte de accesos para auditoría

### **3.4 Upload desde App (Choferes)**
- Choferes suben fotos de remitos
- Upload de comprobantes
- Evidencia fotográfica de entregas

### **3.5 Integraciones Externas**
- Integración con VTV Online (verificación automática)
- API de seguros (estado de pólizas)
- Consulta RENATRE (habilitaciones)

### **3.6 QR en Documentos**
- QR para validación rápida por inspectores
- Código de verificación único por documento
- Validación offline con cache

---

## 🛠️ TECNOLOGÍAS Y STACK ACTUAL

### **Frontend:**
- React 19.1.1 con TypeScript
- Vite 7.1.10 (HMR)
- Tailwind CSS para estilos
- Zustand para state management
- React Router para navegación

### **Backend/Servicios:**
- Google Sheets API v4 (base de datos)
- Google Drive API (almacenamiento archivos)
- Anthropic Claude API (análisis IA)
- jsPDF + html2canvas (generación PDFs)

### **PWA:**
- Service Workers
- Offline support
- Instalable en dispositivos móviles

---

## 📊 MÉTRICAS DE ÉXITO

### **Actuales (Post-Fase 1):**
- ✅ Reportes IA con 100% datos correctos
- ✅ Análisis con contexto completo de negocio
- ✅ UI profesional y moderna
- ✅ Manual accesible en ConsultaInterna

### **Esperadas (Post-Fase 2):**
- **Reducción 80%** en llamadas por documentación
- **100%** documentación vigente en campo
- **Tiempo acceso:** < 10 segundos a cualquier documento
- **Satisfacción choferes:** ≥ 9/10 en encuesta

---

## 👥 EQUIPO Y RESPONSABILIDADES

### **Desarrollo:**
- Claude Code (IA) + Usuario (Validación y Testing)

### **Datos y Contenido:**
- Usuario: Carga de documentación inicial
- Usuario: Mantenimiento de Google Sheets
- Usuario: Upload de cuadernillos mensuales

### **Testing:**
- Usuario: Testing en campo con choferes
- Usuario: Validación de flujos operativos

---

## 📝 NOTAS IMPORTANTES

### **Decisiones Técnicas Tomadas:**
1. ✅ Formato de fecha unificado: YYYY-MM
2. ✅ Almacenamiento híbrido: Sheets (metadata) + Drive (archivos)
3. ✅ Modal emergente para documentación (mejor UX en portería)
4. ✅ Permisos de lectura para todos (sin complicaciones)
5. ✅ Panel administrativo con upload desde app

### **Pendiente de Confirmar:**
- [ ] Nombres exactos de todos los choferes propios actuales
- [ ] Asignación de unidades a cada chofer
- [ ] Documentación actual disponible para carga inicial
- [ ] Estructura específica del "cuadernillo completo"

---

## 🚀 PARA EMPEZAR FASE 2 LA PRÓXIMA SEMANA

### **Pre-requisitos:**
1. Confirmar lista completa de choferes propios
2. Confirmar asignación unidad-chofer
3. Recopilar PDFs de documentación actual
4. Crear carpeta en Google Drive
5. Definir permisos de acceso

### **Primer Paso (Lunes):**
```
1. Abrir Google Drive
2. Crear carpeta "CROSSLOG Documentación"
3. Crear subcarpetas (Choferes, Unidades, Cuadernillos)
4. Abrir Google Sheets principal
5. Crear hojas: Choferes_Docs, Unidades_Docs, Cuadernillos
6. Cargar estructura de columnas
```

---

**¿Listo para empezar la próxima semana?** 🚀

Tenemos todo planificado, estructurado y listo para implementar una mejora significativa que transformará la operación de CROSSLOG.



🚀 PROPUESTAS DE MEJORA - ESTRATEGIA 2025
A. Performance y UX
  - Implementar lazy loading en imágenes de remitos (mejora 40% tiempo de carga)
  - Agregar skeleton loaders en ConsultaCliente/Fletero (mejor percepción de velocidad)
  - Compresión avanzada de imágenes con WebP (reduce 60% tamaño)

   B. Monitoreo y Analytics
  - Integrar Sentry para tracking de errores en producción
  - Implementar Google Analytics 4 para métricas de uso:
    - Tiempo promedio de captura por remito
    - Tasa de uso de OCR vs manual
    - Tasa de entregas completadas por día
  - Dashboard de KPIs en tiempo real en ConsultaInterna

Concepto: Plataforma donde CROSSLOG y FLETEROS compiten por viajes en tiempo real

  Funcionalidades:
  // Nuevo módulo: MarketplaceViajesPage
  1. Publicación de viajes disponibles (desde Consulta Interna)
  2. Fleteros ven viajes compatibles con su flota
  3. Sistema de cotización en tiempo real
  4. Asignación automática (mejor precio + rating)
  5. Tracking en vivo del viaje
  6. Sistema de ratings (chofer + fletero)

  Ventajas competitivas:
  - Transparencia total en costos
  - Optimización de capacidad instalada (reduce viajes vacíos)
  - Nuevo modelo de ingresos: Comisión del 3% por viaje intermediado
  - Data valiosa: Precios de mercado, tiempos promedio, ratings

  5. Integración con ERP de Clientes

  API REST Propia:
  // Endpoints para clientes:
  POST /api/v1/viajes/crear          // Cliente crea viaje desde su ERP
  GET  /api/v1/viajes/{hdr}/estado   // Consulta estado en tiempo real
  GET  /api/v1/viajes/{hdr}/pdfs     // Descarga PDFs automáticamente
  POST /api/v1/webhook/subscribe     // Cliente configura webhook propio

  6. Análisis Predictivo con IA

  Claude AI - Capacidades Avanzadas:
  // Nuevos análisis en Indicadores:
  1. Predicción de demanda por cliente (próximos 30 días)
  2. Recomendación de inversión en flota (¿comprar Semi o Chasis?)
  3. Detección de anomalías (viaje tardando más de lo normal)
  4. Optimización de rutas (clustering de entregas)
  5. Análisis de rentabilidad por cliente/ruta

  Machine Learning:
  - Entrenar modelo con históricos de Google Sheets
  - Predicción de tiempos de entrega
  - Alertas de riesgo de incumplimiento

  ROI esperado: Mejora del 15% en utilización de flota

  🌍 FASE EXPANSIÓN (6-12 Meses)

  7. White-Label para Otras Logísticas 💰 NUEVO MODELO DE NEGOCIO

  Concepto: Vender CROSSLOG PWA como producto SaaS a otras empresas logísticas

  Características:
  - Multi-tenant architecture
  - Branding personalizable (logo, colores)
  - Configuración por empresa (campos custom)
  - Pricing por usuarios activos
  - Soporte técnico incluido

  Modelo de precios:
  - Setup inicial: $500,000 ARS
  - Mensual: $15,000/usuario activo
  - Mínimo: 5 usuarios ($75,000/mes)

  Proyección año 1:
  - 10 empresas × $575,000 promedio = $5.75M setup
  - 10 empresas × $150,000/mes × 12 = $18M recurrente
  Total año 1: $23.75M pesos

  Empresas objetivo: Fleteros actuales (VIMAAB, BARCO, PRODAN) + nuevos

8. Módulo de Planificación de Rutas

  Optimización con IA:
  // Nuevo componente: PlanificadorRutas
  - Importar entregas del día
  - Algoritmo de optimización (TSP - Traveling Salesman)
  - Generación automática de rutas óptimas
  - Asignación inteligente a unidades
  - Estimación de tiempos y costos
  - Exportar a Google Maps con paradas

  Beneficios:
  - Reducción del 20% en kilómetros recorridos
  - Ahorro en combustible
  - Más entregas por día

  Librerías: Google Maps Directions API + Algoritmo genético para TSP

  9. App para Clientes Finales (Receptores) IMPORTANTE ESTA FUNCION

  Concepto: App móvil para quien recibe la mercadería

  Funcionalidades:
  1. Notificación push: "Tu entrega llegará en 15 minutos"
  2. Ver ubicación del camión en tiempo real
  3. Firmar remito desde su celular (sin papel)
  4. Foto de mercadería recibida (evidencia)
  5. Calificar servicio (NPS automático)
  6. Historial de recepciones

  Impacto: Experiencia premium que diferencia a CROSSLOG de competidores

  🔐 FASE CUMPLIMIENTO (Continuo)

  10. Sistema de Cumplimiento Normativo Automático

  Integraciones con organismos oficiales:
  // Verificaciones automáticas:
  1. RENATRE: Validar habilitación de choferes
  2. DNRPA: Verificar estado de unidades
  3. VTV: Consultar vencimientos en línea
  4. Seguros: API con aseguradoras (estado de pólizas)
  5. AFIP: Validar CUIT de fleteros

  Alertas automáticas:
  - Email/WhatsApp 30 días antes de vencimientos
  - Bloqueo preventivo de unidades sin documentación
  - Dashboard de cumplimiento en tiempo real

  Beneficio: Riesgo cero de multas o problemas legales

  ✨ CONCLUSIÓN ESTRATÉGICA

  CROSSLOG PWA no es solo una herramienta operativa, es una plataforma tecnológica con potencial de convertirse en el estándar del mercado logístico
  argentino.


  Marketplace_Viajes ID https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=978741249#gid=978741249

  Marketplace_Ofertas ID https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=682498410#gid=682498410

  Marketplace_Ratings ID https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=500490441#gid=500490441

  Fleteros_Perfil ID https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=1217941925#gid=1217941925