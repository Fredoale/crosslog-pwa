# 📋 Changelog - Sistema de Consultas CROSSLOG

## 🆕 Versión 2.0.0 - Sistema de Consultas Completo
**Fecha:** Octubre 2024

---

## ✨ Nuevas Funcionalidades Implementadas

### 🔐 Sistema de Autenticación Híbrido

#### 1. **Autenticación de Clientes** (AuthCliente.tsx)
- ✅ Login con código de acceso alfanumérico
- ✅ Validación contra Google Sheets (ACCESOS_CLIENTES)
- ✅ Sistema de seguridad:
  - 5 intentos fallidos máximo
  - Bloqueo de 15 minutos tras superar intentos
  - Contador de intentos restantes visible
  - Persistencia de bloqueos en localStorage
- ✅ Limpieza de errores al volver
- ✅ Ejemplo de código: `ABC2024XY` (genérico, no relacionado con empresas)

#### 2. **Autenticación de Fleteros** (AuthFletero.tsx)
- ✅ Login con código de empresa
- ✅ Validación contra Google Sheets (ACCESOS_FLETEROS)
- ✅ Sistema de seguridad idéntico a clientes
- ✅ Auto-selección de empresa tras login
- ✅ Ejemplo de código: `XYZ2024AB` (genérico)

#### 3. **Autenticación Interna** (AuthInterno.tsx)
- ✅ Login con usuario/contraseña
- ✅ Validación contra archivo .env (variables de entorno)
- ✅ Acceso administrativo completo
- ✅ Sin límite de intentos (solo para personal autorizado)

---

### 🔍 Módulos de Consulta

#### 1. **Consulta Clientes** (ConsultaCliente.tsx)
**Funcionalidades:**
- ✅ Búsqueda por HDR o Número de Remito
- ✅ Filtrado automático por cliente autenticado
- ✅ Visualización de entregas con:
  - Estado completado/pendiente
  - Progreso visual con barra
  - Contador de entregas (X/Y)
  - Mini-resumen de cada entrega
  - Iconos de estado (✓ completado, ○ pendiente)
  - Indicador de PDFs disponibles
- ✅ Botón "Limpiar" para nueva búsqueda
- ✅ Persistencia de sesión (30 minutos)
- ✅ Botón "Cerrar sesión"

**Ejemplo de uso:**
```
Cliente: ECOLAB
HDR: 7366289
Resultado: 2 entregas completadas, 2 PDFs disponibles
```

#### 2. **Consulta Fleteros** (ConsultaFletero.tsx)
**Funcionalidades:**
- ✅ Auto-búsqueda tras login
- ✅ Visualización de viajes completados/en curso
- ✅ Filtrado automático por empresa de transporte
- ✅ Resumen ejecutivo de entregas
- ✅ Acceso a PDFs de documentación
- ✅ Persistencia de sesión (30 minutos)

**Empresas soportadas:**
- BARCO
- PRODAN
- LOGZO
- DON PEDRO
- CALLTRUCK
- FALZONE
- ANDROSIUK

#### 3. **Consulta Interna** (ConsultaInterna.tsx)
**Funcionalidades:**
- ✅ Búsqueda sin restricciones
- ✅ Tres modos de búsqueda:
  - Por HDR
  - Por número de remito
  - Por fletero/empresa
- ✅ Opción especial: Filtro "PROPIO" para transporte interno
- ✅ Vista completa de todas las operaciones
- ✅ Resumen avanzado con:
  - Cliente/dador de carga
  - Lista de entregas con detalles
  - PDFs disponibles
  - Estado de cada entrega
- ✅ Botón "Limpiar" en cada modo
- ✅ Persistencia de sesión (30 minutos)

---

### 📊 Vista de Detalles (DetalleViaje.tsx)

**Resumen Ejecutivo:**
- ✅ 4 tarjetas con estadísticas:
  - 📦 Total Entregas (azul)
  - ✅ Completadas (verde)
  - ⏳ Pendientes (amarillo)
  - 📈 Progreso % (morado)
- ✅ Badge de estado:
  - ✅ "Viaje Completado" (verde) si todo listo
  - 🚛 "En Curso" (amarillo) si hay pendientes

**Detalle de Entregas:**
- ✅ Separación visual: Completadas / Pendientes
- ✅ Información por entrega:
  - Número de entrega
  - Cliente
  - Detalle de destino
  - Número de remito
  - Nombre del receptor
  - Links a PDFs (clickeables)
  - Estado con iconos

---

## 🔧 Correcciones Técnicas Implementadas

### 1. **Estructura de Datos Sistema_entregas**
**Columnas corregidas:**
```
A (0)  = Fecha_Viaje (ej: 25-09-2025)
B (1)  = Numero_HDR (ej: 7366289)
C (2)  = numero_entrega (ej: 1)
D (3)  = numero_remitos (JSON: ["38269"])
E (4)  = Dador_carga (ej: ECOLAB) ← CLIENTE
F (5)  = Detalle_entrega (ej: SCC POWER - SAN PEDRO)
G (6)  = Estado (progreso global: "1/2")
H (7)  = Chofer (ej: Martin Romero)
I (8)  = Cant_remito (ej: 1)
J (9)  = entregas_completadas (ej: 1)
K (10) = entregas_pendientes (ej: 1)
L (11) = progreso_porcentaje (ej: 50)
M (12) = firma_receptor (ej: JUAN PEREZ)
N (13) = pdf_urls (JSON array de URLs)
Q (16) = tipo_transporte (ej: FALZONE, BARCO, o vacío=PROPIO)
```

### 2. **Lógica de Estado de Entregas**
**Antes:** ❌ Usaba columna G (progreso global "1/2")
- Problema: Todas las entregas marcadas "EN_REPARTO"

**Ahora:** ✅ Usa presencia de PDF o firma
```typescript
if (pdfUrls.length > 0 || nombreReceptor) {
  estado = 'COMPLETADO';
} else {
  estado = 'PENDIENTE';
}
```

### 3. **Búsqueda por Cliente**
**Antes:** ❌ Filtraba por `clienteId` (ej: "ECO001")
- Problema: No coincidía con `Dador_carga` (ej: "ECOLAB")

**Ahora:** ✅ Usa `nombreCliente` que coincide con `Dador_carga`

### 4. **Búsqueda por Remito**
**Antes:** ❌ Buscaba en columna como texto plano

**Ahora:** ✅ Parsea JSON array `["38269"]` correctamente

### 5. **Tipo de Transporte**
**Antes:** ❌ Label: "Fletero: BARCO"

**Ahora:** ✅ Labels corregidos:
- "Transporte: PROPIO"
- "Transporte: FALZONE"
- "Transporte: BARCO"
- etc.

**Manejo de columna Q vacía:** Si está vacía → "PROPIO"

---

## 🎨 Mejoras de UI/UX

### 1. **Mini-resumen en Resultados**
Cada tarjeta de HDR ahora muestra:
```
HDR: 7366289
Fecha: 25-09-2025
Chofer: Martin Romero
Transporte: PROPIO

Entregas (2):
#1  SCC POWER - SAN PEDRO      ✓  📄
#2  OTRA ENTREGA                ✓  📄

2/2 Completadas  |  2 PDFs
✅ Viaje Completado
```

### 2. **Botones "Limpiar"**
- ✅ Icono de X
- ✅ Aparece cuando hay resultados o búsqueda
- ✅ Limpia formulario y resultados
- ✅ Implementado en todos los módulos

### 3. **Persistencia de Sesiones**
**Características:**
- ⏱️ Timeout: 30 minutos
- 💾 Storage: localStorage
- 🔓 Auto-restauración al volver
- 🚪 Botón explícito de cierre de sesión

**Keys usadas:**
- `crosslog_cliente_session`
- `crosslog_fletero_session`
- `crosslog_interno_session`

**Datos guardados:**
- Cliente: `clienteId`, `nombreCliente`, `timestamp`
- Fletero: `fleteroName`, `timestamp`
- Interno: `authenticated`, `timestamp`

---

## 🔒 Seguridad

### Sistema de Bloqueo por Intentos Fallidos
- ✅ 5 intentos máximos
- ✅ Bloqueo de 15 minutos (900,000 ms)
- ✅ Timer visible con cuenta regresiva
- ✅ Persistencia en localStorage:
  - `auth_cliente_blocked`
  - `auth_cliente_attempts`
  - (similar para fleteros)
- ✅ Reset automático tras bloqueo
- ✅ Mensajes informativos:
  - "Le quedan X intento(s)"
  - "Demasiados intentos fallidos. Acceso bloqueado por 15 minutos."

---

## 📱 Hojas de Google Sheets Utilizadas

### 1. **ACCESOS_CLIENTES** (gid=1931001347)
```
Columna A: ID_Cliente
Columna B: Codigo_Acceso
Columna C: Nombre_Cliente
Columna D: Activo (SI/NO)
```

### 2. **ACCESOS_FLETEROS** (gid=549188602)
```
Columna A: ID_Fletero
Columna B: Codigo_Acceso
Columna C: Nombre_Empresa
Columna D: Activo (SI/NO)
```

### 3. **Sistema_entregas** (gid=129279590)
Fuente única de verdad para todas las consultas.
Contiene entregas completadas e in-progress.

### 4. **BASE**
Solo se usa para validación de unidad en login de choferes (columna H).

---

## 🚀 Ejemplos de Uso

### Ejemplo 1: Cliente busca su entrega
```
1. Ingresar código: ABC2024XY
2. Buscar HDR: 7366289
3. Ver: 2 entregas, 2 completadas
4. Click en "Ver detalles"
5. Descargar PDFs de remitos
```

### Ejemplo 2: Fletero consulta viajes
```
1. Ingresar código: XYZ2024AB
2. Sistema auto-busca viajes de FALZONE
3. Ver lista de viajes completados
4. Click en HDR para ver detalles
```

### Ejemplo 3: Staff interno consulta
```
1. Login con credenciales admin
2. Seleccionar "Buscar por fletero"
3. Elegir "PROPIO"
4. Ver todos los viajes de transporte interno
5. Acceder a resumen completo
```

---

## 📊 Estadísticas del Sistema

- **Total de componentes de consulta:** 7
- **Hojas de Google Sheets usadas:** 4
- **Tipos de búsqueda:** 3 (HDR, Remito, Fletero)
- **Modos de autenticación:** 3 (Cliente, Fletero, Interno)
- **Timeout de sesión:** 30 minutos
- **Límite de intentos:** 5 (con bloqueo de 15 min)
- **Empresas de transporte soportadas:** 7 + PROPIO

---

## 🎯 Próximos Pasos Sugeridos

- [ ] Dashboard analítico con métricas
- [ ] Exportación de datos a Excel/CSV
- [ ] Notificaciones push para clientes
- [ ] Historial de consultas
- [ ] Filtros por rango de fechas
- [ ] Reportes automáticos por email

---

## 📝 Notas Técnicas

### Manejo de Columna G (Estado)
La columna G contiene el progreso global del viaje (ej: "1/2"), **NO** el estado individual de cada entrega. Por eso se usa PDF/firma para determinar estado.

### Columna Q Vacía
Cuando `tipo_transporte` (columna Q) está vacía, se interpreta como transporte "PROPIO".

### Parsing de JSON
Columnas D (remitos) y N (PDFs) contienen arrays JSON:
```json
["38269"]
["https://drive.google.com/file/d/xxx"]
```

Se parsean con `JSON.parse()` y fallback a limpieza manual si falla.

---

<div align="center">

**Sistema de Consultas CROSSLOG v2.0.0**

✅ Todas las funcionalidades implementadas y probadas

</div>
