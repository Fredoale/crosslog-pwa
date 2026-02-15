# 🎨 SISTEMA DE COLORES - CROSSLOG BRANDING

**Actualizado**: 10 de Diciembre, 2025
**Versión**: 3.2.0

---

## 📊 PALETA DE COLORES PRINCIPAL

### 1. Verde CROSSLOG (Principal)
**Uso**: Branding principal, botones primarios, DISTRIBUCIÓN

```css
/* Gradiente Verde */
from-[#a8e063] to-[#56ab2f]

/* Colores individuales */
#a8e063  /* Verde claro */
#56ab2f  /* Verde oscuro */

/* Variantes */
rgba(168, 224, 99, 0.1)   /* 10% opacidad - focus */
rgba(168, 224, 99, 0.35)  /* 35% opacidad - sombras */
```

**Aplicaciones**:
- ✅ Sector DISTRIBUCIÓN
- ✅ Botón "Iniciar Entregas"
- ✅ Indicador de progreso activo
- ✅ Estados "Completado", "Apto"
- ✅ Focus en inputs de DISTRIBUCIÓN

---

### 2. Azul Celeste-Eléctrico (Secundario)
**Uso**: VRAC Cisternas, elementos tecnológicos, información

```css
/* Gradiente Azul Celeste */
from-[#0ea5e9] to-[#06b6d4]

/* Colores individuales */
#0ea5e9  /* Sky blue */
#06b6d4  /* Cyan */

/* Variantes */
rgba(14, 165, 233, 0.1)   /* 10% opacidad - focus */
rgba(14, 165, 233, 0.35)  /* 35% opacidad - sombras */
```

**Aplicaciones**:
- ✅ Sector VRAC CISTERNAS
- ✅ Botones secundarios
- ✅ Links e información
- ✅ Focus en inputs de VRAC
- ✅ Badges informativos
- ✅ Iconos de datos/analytics

---

### 3. Naranja/Amarillo (Alertas y Vital Aire)
**Uso**: VITAL AIRE, alertas, warnings, acciones importantes

```css
/* Gradiente Naranja */
from-[#f59e0b] to-[#f97316]

/* Colores individuales */
#f59e0b  /* Amber */
#f97316  /* Orange */

/* Variantes */
rgba(245, 158, 11, 0.1)   /* 10% opacidad - focus */
rgba(245, 158, 11, 0.35)  /* 35% opacidad - sombras */
```

**Aplicaciones**:
- ✅ Sector VITAL AIRE
- ✅ Alertas de advertencia
- ✅ Estados "Pendiente"
- ✅ Prioridad ALTA
- ✅ Focus en inputs de VITAL AIRE
- ✅ Notificaciones importantes

---

## 🔴 COLORES DE ESTADO

### Colores Semánticos

#### Éxito / Aprobado
```css
#10b981  /* Green 500 */
#22c55e  /* Green 400 */

/* Fondo */
bg-green-50   /* #f0fdf4 */
border-green-500
```

**Uso**: Estados completados, aprobados, OK

---

#### Error / Crítico
```css
#ef4444  /* Red 500 */
#dc2626  /* Red 600 */

/* Fondo */
bg-red-50   /* #fef2f2 */
border-red-500
```

**Uso**: Errores, crítico, NO APTO, rechazado

---

#### Advertencia / Alerta
```css
#f59e0b  /* Amber 500 */
#fbbf24  /* Amber 400 */

/* Fondo */
bg-amber-50   /* #fffbeb */
border-amber-500
```

**Uso**: Warnings, proximidad de vencimiento, atención requerida

---

#### Información
```css
#0ea5e9  /* Sky 500 */
#38bdf8  /* Sky 400 */

/* Fondo */
bg-sky-50   /* #f0f9ff */
border-sky-500
```

**Uso**: Información, datos, estadísticas

---

#### Neutral / Deshabilitado
```css
#6b7280  /* Gray 500 */
#9ca3af  /* Gray 400 */

/* Fondo */
bg-gray-50   /* #f9fafb */
border-gray-300
```

**Uso**: Textos secundarios, elementos deshabilitados

---

## 🎯 APLICACIÓN POR SECTOR

### DISTRIBUCIÓN (Verde)
```css
/* Card de Sector */
bg-gradient-to-r from-[#a8e063] to-[#56ab2f]

/* Input Focus */
borderColor: '#a8e063'
boxShadow: '0 0 0 3px rgba(168, 224, 99, 0.1)'

/* Botón Principal */
background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)
boxShadow: 0 4px 14px rgba(168, 224, 99, 0.4)
```

---

### VRAC CISTERNAS (Azul Celeste)
```css
/* Card de Sector */
bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4]

/* Input Focus */
borderColor: '#0ea5e9'
boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)'

/* Botón Principal */
background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)
boxShadow: 0 4px 14px rgba(14, 165, 233, 0.4)
```

---

### VITAL AIRE (Naranja)
```css
/* Card de Sector */
bg-gradient-to-r from-[#f59e0b] to-[#f97316]

/* Input Focus */
borderColor: '#f59e0b'
boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.1)'

/* Botón Principal */
background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%)
boxShadow: 0 4px 14px rgba(245, 158, 11, 0.4)
```

---

## 🔧 COLORES DE MANTENIMIENTO

### Panel Kanban

#### Columna PENDIENTE
```css
border-top: 4px solid #f59e0b  /* Amber */
bg-gray-50
```

#### Columna EN PROCESO
```css
border-top: 4px solid #0ea5e9  /* Sky */
bg-blue-50
```

#### Columna ESPERANDO REPUESTOS
```css
border-top: 4px solid #f97316  /* Orange */
bg-orange-50
```

#### Columna CERRADO
```css
border-top: 4px solid #10b981  /* Green */
bg-green-50
```

---

### Prioridades de OT

#### 🔴 CRÍTICA
```css
badge: bg-red-500 text-white
icon: ⚠️
border: border-red-500
```

#### 🟠 ALTA
```css
badge: bg-orange-500 text-white
icon: ⚡
border: border-orange-500
```

#### 🟡 MEDIA
```css
badge: bg-amber-500 text-white
icon: ▶️
border: border-amber-500
```

#### 🟢 BAJA
```css
badge: bg-green-500 text-white
icon: ✓
border: border-green-500
```

---

## 📱 COMPONENTES UI

### Botones

#### Primario (Verde)
```tsx
<button className="bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
  Iniciar Entregas
</button>
```

#### Secundario (Azul)
```tsx
<button className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all">
  Ver Detalles
</button>
```

#### Alerta (Naranja)
```tsx
<button className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all">
  Ver Alertas
</button>
```

#### Peligro (Rojo)
```tsx
<button className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all">
  Cancelar OT
</button>
```

---

### Cards

#### Card de Sector (Distribución)
```tsx
<div className="bg-gradient-to-r from-[#a8e063] to-[#56ab2f] p-4 text-white text-center rounded-lg shadow-lg">
  <h3 className="text-lg font-bold">DISTRIBUCIÓN</h3>
  <p className="text-xs opacity-90">Para fleteros y choferes propios</p>
</div>
```

#### Card de Sector (VRAC)
```tsx
<div className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] p-4 text-white text-center rounded-lg shadow-lg">
  <h3 className="text-lg font-bold">VRAC CISTERNAS</h3>
  <p className="text-xs opacity-90">Air Liquide - Seleccionar unidad INT</p>
</div>
```

#### Card de Sector (Vital Aire)
```tsx
<div className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] p-4 text-white text-center rounded-lg shadow-lg">
  <h3 className="text-lg font-bold">VITAL AIRE</h3>
  <p className="text-xs opacity-90">Camionetas - Seleccionar unidad</p>
</div>
```

---

### Badges

#### Badge de Estado (Apto)
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-500">
  ✅ APTO PARA TRANSITAR
</span>
```

#### Badge de Estado (No Apto)
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-500">
  ❌ NO APTO
</span>
```

#### Badge de Prioridad (Crítica)
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
  🔴 CRÍTICA
</span>
```

---

### Inputs

#### Input con Focus (Distribución)
```tsx
<input
  className="w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none transition-all"
  style={{
    borderColor: '#e5e7eb',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = '#a8e063';
    e.target.style.boxShadow = '0 0 0 3px rgba(168, 224, 99, 0.1)';
  }}
  onBlur={(e) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  }}
/>
```

#### Input con Focus (VRAC)
```tsx
<input
  className="w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none transition-all"
  style={{
    borderColor: '#e5e7eb',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = '#0ea5e9';
    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
  }}
  onBlur={(e) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  }}
/>
```

#### Input con Focus (Vital Aire)
```tsx
<input
  className="w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none transition-all"
  style={{
    borderColor: '#e5e7eb',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = '#f59e0b';
    e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
  }}
  onBlur={(e) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  }}
/>
```

---

## 🎨 GRADIENTES ESPECIALES

### Gradiente de Fondo (Login)
```css
background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)
```

### Gradiente de Botón (Hover)
```css
/* Distribución */
hover:from-[#56ab2f] hover:to-[#3d7a1f]

/* VRAC */
hover:from-[#06b6d4] hover:to-[#0891b2]

/* Vital Aire */
hover:from-[#f97316] hover:to-[#ea580c]
```

---

## 📐 SOMBRAS Y EFECTOS

### Sombras de Card
```css
/* Normal */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)

/* Elevada */
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15)

/* Hover */
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2)
```

### Sombras por Color

#### Verde (Distribución)
```css
box-shadow: 0 4px 14px rgba(168, 224, 99, 0.4)
hover: 0 6px 20px rgba(168, 224, 99, 0.5)
```

#### Azul (VRAC)
```css
box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4)
hover: 0 6px 20px rgba(14, 165, 233, 0.5)
```

#### Naranja (Vital Aire)
```css
box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4)
hover: 0 6px 20px rgba(245, 158, 11, 0.5)
```

---

## 🔄 TRANSICIONES

### Estándar
```css
transition: all 0.3s ease-in-out
```

### Hover en Botones
```css
transform: translateY(-2px)
transition: transform 0.2s, box-shadow 0.2s
```

### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}
```

---

## 📊 EJEMPLO DE IMPLEMENTACIÓN COMPLETA

### Checklist Digital - Paso por Paso

```tsx
// STEP 1: Datos Iniciales (Verde - Neutral)
<div className="bg-white rounded-lg border-2 border-gray-200 p-6">
  <h2 className="text-2xl font-bold text-gray-800 mb-4">
    📝 Datos Iniciales
  </h2>
  {/* Inputs con focus verde (Distribución) */}
</div>

// STEP 2: Requisitos Obligatorios (Azul - Información)
<div className="bg-sky-50 rounded-lg border-2 border-sky-200 p-6">
  <h2 className="text-2xl font-bold text-sky-800 mb-4">
    🔧 Requisitos Obligatorios
  </h2>
  {/* Items con colores informativos */}
</div>

// STEP 3: Documentación (Naranja - Alerta)
<div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-6">
  <h2 className="text-2xl font-bold text-amber-800 mb-4">
    📄 Documentación
  </h2>
  {/* Items de documentación */}
</div>

// STEP 4: Resumen Final
// Si APTO → Verde
<div className="bg-green-50 rounded-lg border-2 border-green-500 p-6">
  <h2 className="text-2xl font-bold text-green-800 mb-4">
    ✅ APTO PARA TRANSITAR
  </h2>
</div>

// Si NO APTO → Rojo
<div className="bg-red-50 rounded-lg border-2 border-red-500 p-6">
  <h2 className="text-2xl font-bold text-red-800 mb-4">
    ❌ NO APTO
  </h2>
</div>
```

---

## 🎯 GUÍA DE USO RÁPIDO

| Elemento | Color Principal | Uso |
|----------|-----------------|-----|
| **Distribución** | Verde #a8e063 | Sector principal, entregas |
| **VRAC** | Azul #0ea5e9 | Cisternas Air Liquide |
| **Vital Aire** | Naranja #f59e0b | Camionetas |
| **Éxito** | Verde #10b981 | Completado, Aprobado |
| **Error** | Rojo #ef4444 | Crítico, Rechazado |
| **Advertencia** | Amarillo #fbbf24 | Alertas, Warnings |
| **Información** | Azul #0ea5e9 | Datos, Info |
| **Neutral** | Gris #6b7280 | Deshabilitado, Secundario |

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Paleta de colores definida
- [x] Colores por sector implementados
- [x] Gradientes configurados
- [x] Focus states diferenciados
- [x] Badges de estado
- [x] Botones primarios/secundarios
- [x] Sombras consistentes
- [x] Transiciones suaves
- [ ] Modo oscuro (futuro)
- [ ] Accesibilidad WCAG AA (futuro)

---

**Documento creado**: 10 de Diciembre, 2025
**Última actualización**: 10 de Diciembre, 2025
