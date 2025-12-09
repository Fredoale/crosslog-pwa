# Sistema de Gestión de Documentos - Crosslog

## Descripción General

Sistema completo de gestión de documentación para choferes y unidades de Crosslog. Incluye:
- **Visualización para choferes**: Botón "Ver Mi Documentación" que muestra documentos personales, de unidad y cuadernillos
- **Panel administrativo**: Gestión completa de documentos con carga de nuevos archivos
- **Alertas automáticas**: Notificaciones de vencimientos próximos o documentos vencidos
- **Integración con Google Sheets**: Lectura y escritura de datos

## Arquitectura del Sistema

### 1. Vista del Chofer

**Ubicación**: Aparece en `EntregasList.tsx` cuando el chofer ve su HDR

**Flujo**:
1. Chofer ingresa su HDR en modo consulta
2. Sistema carga automáticamente sus datos desde Google Sheets:
   - **Documentos personales** (Choferes_Documentos)
   - **Documentos de la unidad** asignada (Unidades_Documentos)
   - **Cuadernillo más reciente** (Cuadernillos)
3. Aparece botón "Ver Mi Documentación" con badge de alertas (si las hay)
4. Al hacer clic, abre modal con 3 tabs:
   - **Cuadernillo**: Documento completo del mes actual
   - **Mis Documentos**: Registro, Lintín, DNI
   - **Unidad**: Seguro, VTV, Cédula Verde

**Archivos involucrados**:
- `src/components/EntregasList.tsx` - Botón y lógica de carga
- `src/components/documentos/DocumentosModal.tsx` - Modal de visualización
- `src/components/documentos/DocumentCard.tsx` - Cards de documentos
- `src/stores/documentosStore.ts` - State management

### 2. Panel Administrativo

**Ubicación**: Consulta Interna > Recursos > Abrir Panel

**Flujo**:
1. Administrador accede a Consulta Interna (credenciales requeridas)
2. Va a sección "Recursos"
3. Click en "Abrir Panel Administrativo"
4. Navega a página completa de Gestión de Documentos
5. Puede ver listados de:
   - Documentos de choferes
   - Documentos de unidades
   - Cuadernillos mensuales
6. Botón "Agregar Nuevo" abre modal para cargar documentos
7. Datos se guardan en Google Sheets vía Apps Script

**Archivos involucrados**:
- `src/components/ConsultaInterna.tsx` - Sección Recursos y navegación
- `src/components/admin/GestionDocumentosPage.tsx` - Página principal
- `src/utils/sheetsApi.ts` - Funciones de lectura/escritura

## Estructura de Google Sheets

### Hoja: `Choferes_Documentos`

| NombreChofer | Unidad | Tipo | NombreDocumento | FechaVencimiento | URLArchivo | EsPropio |
|--------------|--------|------|-----------------|------------------|------------|----------|
| Juan Perez | 62 | registro | Registro de Conducir | 2025-12-31 | https://... | TRUE |
| Juan Perez | 62 | lintin | Lintín | 2025-06-30 | https://... | TRUE |
| Juan Perez | 62 | dni | DNI | | https://... | TRUE |

**Tipos válidos**: `registro`, `lintin`, `dni`

### Hoja: `Unidades_Documentos`

| NumeroUnidad | Tipo | NombreDocumento | FechaVencimiento | URLArchivo |
|--------------|------|-----------------|------------------|------------|
| 62 | seguro | Seguro Unidad 62 | 2025-12-31 | https://... |
| 62 | vtv | VTV Unidad 62 | 2025-06-30 | https://... |
| 62 | cedula | Cédula Verde | 2026-01-15 | https://... |

**Tipos válidos**: `seguro`, `vtv`, `cedula`

### Hoja: `Cuadernillos`

| NombreChofer | Mes | FechaEmision | FechaVencimiento | URLCuadernillo |
|--------------|-----|--------------|------------------|----------------|
| Juan Perez | 2024-11 | 2024-11-01 | 2024-11-30 | https://... |
| Juan Perez | 2024-12 | 2024-12-01 | 2024-12-31 | https://... |

**Formato de Mes**: `YYYY-MM` (ejemplo: `2024-11`)

## Sistema de Alertas

El sistema genera alertas automáticas basadas en fechas de vencimiento:

### Estados de Documentos

1. **VIGENTE** (Verde)
   - Más de 30 días para vencer
   - Sin alertas

2. **POR_VENCER** (Amarillo)
   - Entre 1 y 30 días para vencer
   - Alerta de criticidad media o alta (si quedan ≤7 días)

3. **VENCIDO** (Rojo)
   - Fecha de vencimiento pasada
   - Alerta de criticidad alta

### Lógica de Alertas

```typescript
// src/utils/vencimientosUtils.ts

export function calcularEstadoDocumento(fechaVencimiento: string): EstadoDocumento {
  const dias = diasHastaVencimiento(fechaVencimiento);

  if (dias < 0) return 'VENCIDO';
  if (dias <= 30) return 'POR_VENCER';
  return 'VIGENTE';
}
```

Las alertas se muestran:
- Como badge en el botón "Ver Mi Documentación"
- En la tab "Alertas" del modal
- Ordenadas por días restantes (más urgentes primero)

## Configuración del Sistema

### 1. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto con:

```bash
# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=tu_api_key
VITE_GOOGLE_SPREADSHEET_ENTREGAS_ID=id_de_tu_spreadsheet

# Google Apps Script (para escritura)
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
```

**Ver `.env.example` para todas las variables necesarias**

### 2. Desplegar Google Apps Script

Sigue las instrucciones en `google-apps-script/README.md`:

1. Abre tu spreadsheet de Sistema_Entregas
2. Ve a Extensiones > Apps Script
3. Copia el código de `google-apps-script/Code.gs`
4. Despliega como Web App
5. Copia la URL y agrégala a `.env`

### 3. Estructura de Hojas en Google Sheets

Asegúrate de tener las 3 hojas con los nombres exactos:
- `Choferes_Documentos`
- `Unidades_Documentos`
- `Cuadernillos`

Con las columnas especificadas en la sección "Estructura de Google Sheets" arriba.

## Uso del Sistema

### Para Choferes

1. Ingresar a la app con credenciales
2. Buscar HDR en modo consulta
3. Ver botón "Ver Mi Documentación" (solo si `esPropio=TRUE`)
4. Click para ver todos los documentos
5. Ver alertas de vencimientos
6. Descargar PDFs necesarios

### Para Administradores

1. Acceder a Consulta Interna
2. Ir a sección "Recursos"
3. Click en "Abrir Panel Administrativo"
4. Ver listados por categoría (Choferes/Unidades/Cuadernillos)
5. Click en "Agregar Nuevo" para cargar documento
6. Completar formulario con todos los campos
7. Subir PDF a Google Drive primero (obtener URL pública)
8. Pegar URL en formulario
9. Guardar

## API de sheetsApi.ts

### Funciones de Lectura

```typescript
// Obtener documentos de un chofer
await sheetsApi.fetchChoferDocumentos(nombreChofer: string)

// Obtener documentos de una unidad
await sheetsApi.fetchUnidadDocumentos(numeroUnidad: string)

// Obtener cuadernillo más reciente (o de un mes específico)
await sheetsApi.fetchCuadernillo(nombreChofer: string, mes?: string)
```

### Funciones de Escritura

```typescript
// Agregar documento de chofer
await sheetsApi.addChoferDocumento({
  nombreChofer: string,
  unidad: string,
  tipo: 'registro' | 'lintin' | 'dni',
  nombreDocumento: string,
  fechaVencimiento?: string,  // YYYY-MM-DD
  urlArchivo: string,
  esPropio: boolean
})

// Agregar documento de unidad
await sheetsApi.addUnidadDocumento({
  numeroUnidad: string,
  tipo: 'seguro' | 'vtv' | 'cedula',
  nombreDocumento: string,
  fechaVencimiento: string,  // YYYY-MM-DD
  urlArchivo: string
})

// Agregar cuadernillo
await sheetsApi.addCuadernillo({
  nombreChofer: string,
  mes: string,  // YYYY-MM
  fechaEmision?: string,  // YYYY-MM-DD
  fechaVencimiento?: string,  // YYYY-MM-DD
  urlCuadernillo: string
})
```

## Tipos de Datos

```typescript
// src/types/documentos.ts

interface DocumentoChofer {
  id: string;
  tipo: 'registro' | 'lintin' | 'dni';
  nombre: string;
  choferNombre: string;
  urlArchivo: string;
  fechaVencimiento?: string;
  estado: EstadoDocumento;
}

interface DocumentoUnidad {
  id: string;
  tipo: 'seguro' | 'vtv' | 'cedula';
  nombre: string;
  numeroUnidad: string;
  urlArchivo: string;
  fechaVencimiento: string;
  estado: EstadoDocumento;
}

interface Cuadernillo {
  mes: string;  // YYYY-MM
  cuadernilloCompleto: string;  // URL
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoDocumento;
}

type EstadoDocumento = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
```

## Flujo de Datos

```
┌─────────────────┐
│  Chofer ve HDR  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ documentosStore.        │
│ cargarDocumentosChofer  │
└────────┬────────────────┘
         │
         ├──► sheetsApi.fetchChoferDocumentos()
         ├──► sheetsApi.fetchUnidadDocumentos()
         └──► sheetsApi.fetchCuadernillo()
         │
         ▼
┌─────────────────────────┐
│ Calcular Estados        │
│ y Alertas               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Mostrar en Modal        │
│ con badges y alertas    │
└─────────────────────────┘


Admin: Agregar Documento
────────────────────────

┌──────────────────┐
│ Completar Form   │
└────────┬─────────┘
         │
         ▼
┌───────────────────────────┐
│ GestionDocumentosPage     │
│ handleGuardar()           │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ sheetsApi.addXXX()        │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Google Apps Script        │
│ (Web App endpoint)        │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Google Sheets             │
│ appendRow()               │
└───────────────────────────┘
```

## Troubleshooting

### El botón "Ver Mi Documentación" no aparece

**Causas posibles**:
1. El chofer no tiene `esPropio=TRUE` en la hoja
2. No hay documentos para ese chofer en Google Sheets
3. El nombre del chofer no coincide exactamente (sensible a mayúsculas/espacios)

**Solución**:
- Verificar que exista al menos un registro con el nombre exacto del chofer
- Verificar que columna G (EsPropio) tenga valor "TRUE"
- Ver consola del navegador (F12) para logs

### El modal muestra "No se encontraron documentos"

**Causas posibles**:
1. No hay datos en las hojas de Google Sheets
2. Nombre del chofer no coincide
3. Error en la API key o spreadsheet ID

**Solución**:
- Verificar variables de entorno en `.env`
- Verificar que las hojas tengan los nombres exactos
- Ver logs en consola para detalles del error

### No se guardan los documentos nuevos

**Causas posibles**:
1. Google Apps Script no desplegado correctamente
2. URL del Apps Script incorrecta en `.env`
3. Permisos del Apps Script no configurados

**Solución**:
- Seguir paso a paso las instrucciones en `google-apps-script/README.md`
- Verificar que la URL en `.env` sea exactamente la del Web App deployment
- Asegurarse de que el Apps Script tenga permisos para editar el spreadsheet

### Las alertas no se muestran correctamente

**Causas posibles**:
1. Fechas de vencimiento en formato incorrecto
2. Fechas vacías para documentos que deberían tenerlas

**Solución**:
- Usar siempre formato `YYYY-MM-DD` (ejemplo: `2025-12-31`)
- Dejar vacío solo para documentos sin vencimiento (como DNI)
- Verificar que no haya espacios extras en las celdas

## Mantenimiento

### Agregar nuevo tipo de documento

1. Actualizar tipos en `src/types/documentos.ts`
2. Agregar opción en el select del formulario
3. Actualizar validaciones si es necesario

### Cambiar lógica de alertas

Editar `src/utils/vencimientosUtils.ts`:
- `calcularEstadoDocumento()` - Cambiar umbrales de días
- `generarMensajeAlerta()` - Personalizar mensajes

### Agregar nuevas hojas

1. Crear función fetch en `sheetsApi.ts`
2. Crear función write en `sheetsApi.ts`
3. Agregar action en Google Apps Script
4. Actualizar documentosStore si es necesario

## Seguridad

- Las credenciales están en `.env` (no en código)
- `.env` está en `.gitignore` (no se sube a Git)
- Usar `.env.example` para documentar variables necesarias
- Google Apps Script valida datos antes de escribir
- URLs de PDFs deben ser públicas o con permisos compartidos

## Contacto y Soporte

Para dudas o problemas con el sistema de documentos:
- Ver logs en consola del navegador (F12)
- Ver logs en Google Apps Script (View > Logs)
- Contactar al equipo de desarrollo de Crosslog
