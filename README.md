# 🚛 CROSSLOG - Sistema de Gestión de Entregas

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)

**Progressive Web App** para gestión completa de entregas logísticas con captura inteligente, firma digital, OCR, sincronización offline y sistema de consultas multi-perfil

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Deploy](#-deploy)

</div>

---

## ✨ Características

### ✅ SISTEMA COMPLETO - TODAS LAS FUNCIONALIDADES IMPLEMENTADAS

#### 🎯 Fase 1: Funcionalidad Core
- ✅ Login con HDR y validación contra Google Sheets BASE
- ✅ Validación de seguridad con selección de unidad/transporte
- ✅ Lista de entregas con barra de progreso visual (X/Y)
- ✅ Captura inteligente con botón "Agregar Remito"
  - Opciones separadas: **CÁMARA** (directo a cámara) y **GALERÍA** (selección de fotos)
  - Hasta 7 remitos por entrega
  - Rotación automática a vertical
- ✅ Firma digital con canvas táctil responsivo
- ✅ Geolocalización automática GPS en tiempo real
- ✅ Persistencia local con IndexedDB (Dexie.js)
- ✅ UI optimizada para campo (botones grandes, alto contraste)
- ✅ Modo edición: agregar remitos adicionales a entregas completadas

#### 📸 Fase 2: Scanner y Procesamiento
- ✅ OCR con Tesseract.js para detección automática de números
- ✅ Editor de imágenes integrado (rotación, ajustes)
- ✅ Scanner de documentos con detección de bordes (OpenCV.js)
- ✅ Miniaturas optimizadas para visualización rápida
- ✅ Validación de números de remito con filtrado inteligente
- ✅ Fallback a ingreso manual con teclado numérico

#### 📤 Fase 3: PDFs y Sincronización
- ✅ Generación de PDF individual por remito con pdf-lib
- ✅ Firma incluida como segunda página del PDF
- ✅ Geolocalización incrustada en metadatos
- ✅ Upload a Google Drive con Service Account (sin OAuth popup)
- ✅ Organización por carpetas de cliente en Drive
- ✅ Webhook N8N con datos completos y enriquecidos
- ✅ Cola de sincronización offline con retry automático
- ✅ Sistema de progreso en tiempo real

#### 🌐 Fase 4: PWA Completa
- ✅ Service Worker con Workbox para caching estratégico
- ✅ Modo offline completo (captura sin conexión)
- ✅ Auto-actualización silenciosa
- ✅ Instalable como app nativa (Android/iOS)
- ✅ Notificaciones push (preparado para futuras features)
- ✅ Build optimizado con code splitting y tree shaking
- ✅ Capacitor 6 para acceso a APIs nativas

#### 🔐 Fase 5: Sistema de Consultas Multi-Perfil

**Consulta Clientes**
- ✅ Autenticación con código de acceso único por cliente
- ✅ Búsqueda por HDR o número de remito
- ✅ Visualización de entregas completadas/pendientes
- ✅ Acceso directo a PDFs de remitos conformados
- ✅ Sistema de seguridad: 5 intentos fallidos → 15 min de bloqueo
- ✅ Persistencia de sesión (30 minutos de inactividad)
- ✅ Paginación automática (20 HDRs por página)
- ✅ Botón "Actualizar lista" para refrescar datos

**Consulta Fleteros**
- ✅ Autenticación por empresa de transporte
- ✅ Empresas soportadas: VIMAAB, BARCO, PRODAN, LOGZO, DON PEDRO, CALLTRUCK, ANDROSIUK
- ✅ Visualización de viajes completados y en curso
- ✅ Filtrado automático por empresa
- ✅ Historial de entregas realizadas con detalles
- ✅ Acceso a documentación completa de viajes
- ✅ Paginación y búsqueda avanzada
- ✅ Botón "Actualizar lista" para refrescar datos

**Consulta Interna (Administrativa)**
- ✅ Acceso administrativo con credenciales
- ✅ Búsqueda avanzada múltiple:
  - Por HDR
  - Por número de remito
  - Por fletero/empresa (incluye CROSSLOG - transporte propio)
- ✅ Detección inteligente de transporte:
  - Nombres de choferes → CROSSLOG
  - Nombres de empresas → Fletero correspondiente
- ✅ Vista completa de todas las operaciones
- ✅ Resumen ejecutivo con estadísticas en tiempo real
- ✅ Formato de fecha DD/MM/YYYY
- ✅ Botón "Limpiar" que recarga todos los HDRs

**Detalles de Viaje (Compartido)**
- ✅ Resumen con estadísticas:
  - Total de entregas
  - Entregas completadas/pendientes
  - Progreso en porcentaje con barra visual
- ✅ Información del viaje:
  - HDR, Fecha (formato DD/MM/YYYY)
  - Chofer, Tipo de transporte
- ✅ Lista detallada de entregas con estado visual
- ✅ Links directos a PDFs de remitos en Google Drive
- ✅ Información de firma y receptor
- ✅ Datos de geolocalización cuando disponibles

#### 📊 Fase 6: Integración N8N
- ✅ Webhook para registro en Sistema_Entregas
- ✅ Actualización automática de Estado_progreso
- ✅ Datos enriquecidos con progreso de viaje
- ✅ Listas de entregas completadas/pendientes
- ✅ Modo edición: campo `is_edit` y `remitos_agregados`
- ✅ Auto-scroll al final al enviar datos

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| **Frontend** | React 19.1, TypeScript 5.7, Vite 7.1, Tailwind CSS 4 |
| **State** | Zustand con persistencia en localStorage |
| **Storage** | Dexie.js (IndexedDB), Google Sheets API v4 |
| **Files** | Google Drive API v3 (Service Account), pdf-lib |
| **Mobile** | Capacitor 6 (Camera, Geolocation, Filesystem) |
| **PWA** | Workbox, vite-plugin-pwa |
| **OCR/CV** | Tesseract.js, OpenCV.js (@techstark/opencv-js) |
| **Auth** | Google Service Account (sin OAuth popup) |
| **Backend** | N8N (webhooks, workflows, automatización) |

---

## 🚀 Instalación

### Requisitos
- Node.js 18+ (v20 recomendado)
- npm o yarn
- Git
- Cuenta Google Cloud (para Service Account)
- N8N instance (para webhooks)

### Setup Rápido

```bash
# 1. Clonar repositorio
git clone https://github.com/Fredoale/crosslog-pwa.git
cd crosslog-pwa

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```env
# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=your_api_key
VITE_SPREADSHEET_ID=your_base_spreadsheet_id
VITE_SPREADSHEET_ENTREGAS_ID=your_sistema_entregas_id

# Google Drive Service Account
VITE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
VITE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
VITE_GOOGLE_DRIVE_FOLDER_ID=your_default_folder_id

# N8N Webhook
VITE_N8N_WEBHOOK_URL=https://your-n8n.com/webhook/entregas

# App Config
VITE_APP_VERSION=2.0.0
VITE_ENVIRONMENT=production
```

### Configuración Detallada

Ver documentación específica:
- **[GOOGLE-SERVICE-ACCOUNT-SETUP.md](./GOOGLE-SERVICE-ACCOUNT-SETUP.md)** - Service Account setup
- **[N8N-SETUP.md](./N8N-SETUP.md)** - N8N webhooks y workflows
- **[DEPLOY.md](./DEPLOY.md)** - Guía de deployment completa

---

## 💻 Comandos

```bash
# Desarrollo
npm run dev                # Servidor de desarrollo (puerto 5173)
npm run build             # Build de producción
npm run preview           # Preview del build

# Linting
npm run lint              # ESLint check

# Mobile (Android)
npx cap sync android      # Sincronizar cambios
npx cap open android      # Abrir Android Studio
npx cap run android       # Build y ejecutar

# Mobile (iOS)
npx cap sync ios          # Sincronizar cambios
npx cap open ios          # Abrir Xcode
npx cap run ios           # Build y ejecutar
```

---

## 📱 Uso

### 🚚 Modo Chofer (Captura de Entregas)

#### 1. Login
1. Ingresar **HDR** (ejemplo: 708090)
2. Ingresar nombre del **chofer**
3. **Validación de seguridad**: Seleccionar unidad/transporte
   - Se valida contra columna Q del spreadsheet BASE
   - Previene inicio con HDR incorrecto
4. Click **"Iniciar Entregas"**

#### 2. Lista de Entregas
- Ver progreso visual: **X/Y completadas** (barra de progreso)
- Estados:
  - 🟡 **PENDIENTE** - Sin iniciar
  - 🔵 **EN REPARTO** - En proceso (con remitos agregados)
  - 🟢 **COMPLETADO** - Finalizado con PDFs subidos
- Click en entrega para capturar o editar

#### 3. Captura de Remitos

**Destino de Entrega**
- Auto-completa desde Google Sheets
- Editable manualmente (ej: "BUNGE CAMPANA / TRANSCLOR PILAR")

**Agregar Remitos**
1. Click **"Agregar Remito"**
2. Elegir opción:
   - **📷 CÁMARA**: Abre cámara directamente
   - **🖼️ GALERÍA**: Selecciona foto existente
3. Para cada foto:
   - Ingresar número de remito manualmente
   - O usar botón **"OCR"** para detección automática
   - Botón **"Editar"** para ajustes de imagen
4. Repetir hasta agregar todos los remitos (máximo 7)

**Firma del Receptor**
1. Click **"Agregar Firma"**
2. Dibujar firma con el dedo/stylus
3. Ingresar nombre del receptor
4. **Guardar**

**Progreso de Viaje** (visible después de agregar fotos)
- Resumen del viaje completo:
  - Total de entregas
  - Completadas vs Pendientes
  - Barra de progreso visual
  - Indicador de última entrega

#### 4. Finalizar y Enviar
1. Click **"Finalizar y Enviar"**
2. Auto-scroll al final de la página
3. Ver progreso en tiempo real:
   - ⏳ Obteniendo ubicación...
   - 📄 Generando PDFs... (1 por remito)
   - ☁️ Subiendo X PDFs a Google Drive...
   - 📡 Enviando datos al Sistema de Entregas...
   - ✅ ¡Completado!

#### 5. Modo Edición
- En entregas **COMPLETADAS**, aparece botón **"Agregar Más Remitos"**
- Permite agregar remitos adicionales sin perder los existentes
- Los nuevos PDFs se agregan a la lista existente
- El webhook incluye campo `is_edit: true` y `remitos_agregados`

---

### 👥 Modo Consulta (Multi-Perfil)

#### Consulta Clientes
**Acceso:**
1. Seleccionar **"Consulta Clientes"**
2. Ingresar código de acceso (ej: `ECO2024`)
3. Sistema valida contra hoja **Codigos_Clientes**

**Funcionalidades:**
- Búsqueda por **HDR** o **Número de Remito**
- Ver lista de viajes con:
  - Fecha (formato DD/MM/YYYY)
  - HDR, Chofer
  - Progreso (X/Y entregas)
- Click en viaje para ver **Detalle Completo**
- Botón **"Limpiar"** recarga datos del cliente
- Botón **"Actualizar lista"** refresca información
- Paginación automática (20 por página)

**Seguridad:**
- 5 intentos fallidos → Bloqueo de 15 minutos
- Sesión expira tras 30 minutos de inactividad
- Logout manual disponible

#### Consulta Fleteros
**Acceso:**
1. Seleccionar **"Consulta Fleteros"**
2. Ingresar código de empresa (ej: `VIM2025`)
3. Sistema valida contra hoja **Codigos_Fleteros**

**Empresas Soportadas:**
- VIMAAB
- BARCO
- PRODAN
- LOGZO
- DON PEDRO
- CALLTRUCK
- ANDROSIUK

**Funcionalidades:**
- Vista automáticamente filtrada por empresa
- Búsqueda por **HDR** o **Remito**
- Información de viajes:
  - Fecha (formato DD/MM/YYYY)
  - HDR, Chofer, Transporte
  - Estado y progreso
- Botón **"Limpiar"** recarga datos del fletero
- Botón **"Actualizar lista"** refresca información
- Mismas opciones de seguridad que Clientes

#### Consulta Interna (Administrativa)
**Acceso:**
1. Seleccionar **"Consulta Interna"**
2. Ingresar credenciales administrativas
3. Validación contra hoja **Codigos_Interno**

**Funcionalidades Avanzadas:**
- **Ver todos los HDRs** de Sistema_Entregas
- **Búsqueda múltiple:**
  - Por HDR
  - Por Número de Remito
  - Por Fletero (dropdown con todas las empresas + CROSSLOG)
- **Detección inteligente de transporte:**
  - Si columna Q contiene nombre de chofer → CROSSLOG
  - Si columna Q contiene empresa conocida → Esa empresa
- **Filtro avanzado** por tipo de transporte
- Botón **"Limpiar"** recarga TODOS los HDRs
- Resumen ejecutivo con estadísticas globales

#### Detalle de Viaje (Vista Compartida)
**Información Mostrada:**

**Resumen:**
- HDR y Fecha (DD/MM/YYYY)
- Chofer y Tipo de Transporte
- Barra de progreso visual
- Estadísticas: Total / Completadas / Pendientes / Porcentaje

**Lista de Entregas:**
- Estado visual (🟢 Completado / 🟡 Pendiente)
- Número de entrega y cliente
- Detalle de puntos de carga/descarga
- Remitos asociados con links a PDFs
- Receptor que firmó
- Fecha de actualización

**Acciones:**
- Click en PDF para abrir en nueva pestaña
- Volver a lista de resultados
- Cerrar sesión

---

## 🌐 Deploy

### Web (Netlify)

**Auto-deploy configurado:**
```bash
# Push a main activa deploy automático
git push origin main
```

**Manual:**
```bash
npm run build
netlify deploy --prod --dir=dist
```

**Variables de entorno en Netlify:**
- Configurar todas las `VITE_*` en Site Settings > Environment Variables

### Android

```bash
# 1. Build web
npm run build

# 2. Sync con Capacitor
npx cap sync android

# 3. Abrir Android Studio
npx cap open android

# 4. En Android Studio:
# Build > Generate Signed Bundle / APK
# Seleccionar Release
# Firmar con keystore
```

### iOS

```bash
# 1. Build web
npm run build

# 2. Sync con Capacitor
npx cap sync ios

# 3. Abrir Xcode
npx cap open ios

# 4. En Xcode:
# Product > Archive
# Distribute App > App Store Connect
```

**Ver guía detallada:** [DEPLOY.md](./DEPLOY.md)

---

## 📊 Estructura de Datos

### Webhook N8N (Sistema_Entregas)

```json
{
  "hdr": "708090",
  "numero_entrega": "001",
  "numeros_remito": ["38269", "38270"],
  "cliente": "ECO",
  "cliente_nombre_completo": "ECOLAB",
  "detalle_entregas": "BUNGE CAMPANA / TRANSCLOR PILAR",
  "estado": "COMPLETADO",
  "chofer": "Juan Perez",
  "tipo_transporte": "CROSSLOG",
  "timestamp": "2025-11-11T10:30:00Z",
  "fecha_viaje": "2025-11-11",
  "geolocalizacion": {
    "lat": -34.6037,
    "lng": -58.3816,
    "accuracy": 10
  },
  "pdf_urls": [
    "https://drive.google.com/file/d/xxx",
    "https://drive.google.com/file/d/yyy"
  ],
  "firma_receptor": "Maria Lopez",
  "numero_remitos": 2,
  "version_app": "2.0.0",
  "is_edit": false,
  "remitos_agregados": 0,
  "total_entregas": 5,
  "entregas_completadas": 3,
  "entregas_pendientes": 2,
  "progreso_porcentaje": 60,
  "entregas_completadas_detalle": [
    "ECOLAB - Punto A",
    "BUNGE - Punto B",
    "TRANSCLOR - Punto C"
  ],
  "entregas_pendientes_detalle": [
    "DOW - Punto D",
    "BASF - Punto E"
  ]
}
```

### Google Sheets Estructura

**BASE (Inicio de viaje):**
- Columna A: HDR
- Columna B: Número de entrega
- Columna C: Fecha del viaje
- Columna D: Cliente (ID corto)
- Columna E: Cliente nombre completo
- Columna F: Detalle de entregas
- Columna Q: Chofer/Transporte (usado para validación)

**Sistema_Entregas (Registro):**
- Similar a BASE + columnas adicionales:
- Remitos, Estado, Fecha actualización
- PDF URLs, Firma receptor
- Geolocalización

**Codigos_Clientes:**
- ID_Cliente | Codigo_Acceso | Nombre_Cliente | Activo

**Codigos_Fleteros:**
- Nombre_Fletero | Codigo_Acceso | Activo

**Codigos_Interno:**
- Usuario | Contraseña | Nombre_Completo | Activo

---

## 🗂️ Estructura del Proyecto

```
crosslog-pwa/
├── src/
│   ├── components/              # React components
│   │   ├── Login.tsx                  # Login choferes
│   │   ├── EntregasList.tsx           # Lista de entregas
│   │   ├── CapturaForm.tsx            # Captura (NEW: botón colapsable)
│   │   ├── SignatureCanvas.tsx        # Canvas de firma
│   │   ├── ImageEditor.tsx            # Editor de imágenes
│   │   ├── AuthCliente.tsx            # Auth clientes
│   │   ├── AuthFletero.tsx            # Auth fleteros
│   │   ├── AuthInterno.tsx            # Auth interno
│   │   ├── ConsultaCliente.tsx        # Consulta clientes (NEW: actualizar lista)
│   │   ├── ConsultaFletero.tsx        # Consulta fleteros (NEW: actualizar lista)
│   │   ├── ConsultaInterna.tsx        # Consulta interna (NEW: CROSSLOG detection)
│   │   └── DetalleViaje.tsx           # Detalle HDR
│   ├── db/                      # IndexedDB
│   │   └── offlineDb.ts
│   ├── hooks/                   # React hooks
│   │   ├── useGeolocation.ts
│   │   └── useOfflineSync.ts
│   ├── stores/                  # Zustand stores
│   │   └── entregasStore.ts           # Estado global + persistencia
│   ├── utils/                   # Utilities
│   │   ├── sheetsApi.ts               # Google Sheets API (NEW: smart transport detection)
│   │   ├── googleDriveService.ts      # Service Account upload
│   │   ├── ocrScanner.ts              # Tesseract OCR
│   │   ├── documentScanner.ts         # OpenCV scanner
│   │   ├── imageRotation.ts           # Auto-rotation
│   │   └── pdfGenerator.ts            # PDF con firma
│   └── types/                   # TypeScript types
│       └── index.ts                   # Tipos centralizados
├── public/                      # Static assets
│   └── manifest.webmanifest           # PWA manifest
├── android/                     # Capacitor Android
├── ios/                         # Capacitor iOS
├── capacitor.config.ts          # Capacitor config
├── vite.config.ts               # Vite config + PWA plugin
└── tailwind.config.js           # Tailwind CSS config
```

---

## 🔧 Solución de Problemas

### Cámara no funciona en dispositivo
**Síntomas:** Botón CÁMARA no abre la cámara

**Solución:**
1. Verificar permisos en el dispositivo:
   - Settings > Apps > CROSSLOG > Permissions
   - Habilitar **Cámara** y **Almacenamiento**
2. En Android 13+, asegurar que el input tiene `capture="environment"`
3. Verificar en código: `cameraInputRef` con atributo `capture`
4. Para debugging, revisar logs en consola: `[CapturaForm] Checking permissions for source: CAMERA`

### PDFs no suben a Drive
**Síntomas:** Error al subir PDFs, entregas no se completan

**Solución:**
1. Verificar Service Account email en `.env`
2. Confirmar que el Service Account tiene permisos de **Editor** en las carpetas
3. Revisar que `VITE_SERVICE_ACCOUNT_PRIVATE_KEY` esté correctamente escapado
4. Check logs: `[CapturaForm] Upload X completed: SUCCESS` o error específico
5. Si falla, verificar configuración en `GOOGLE-SERVICE-ACCOUNT-SETUP.md`

### Consultas muestran 0 resultados
**Síntomas:** Clientes/Fleteros ven lista vacía

**Solución:**
1. Verificar autenticación correcta
2. Para Clientes: Asegurar que Sistema_Entregas tiene `clienteId` en columna Dador_carga (ej: "ECO")
3. Para Fleteros: Verificar que columna Q tiene nombre de empresa (ej: "VIMAAB")
4. Para CROSSLOG: Verificar detección inteligente:
   - Logs deben mostrar: `isKnownFletero` false para choferes
   - Nombres de choferes → CROSSLOG automáticamente
5. Revisar logs en consola para ver matching de filtros

### Formato de fecha incorrecto
**Síntomas:** Fechas muestran YYYY/MM/DD en lugar de DD/MM/YYYY

**Solución:**
- Ya implementado en `sheetsApi.ts` líneas 1524-1541
- Si aparece mal, verificar que `buildHDRDataFromSistema` tiene la conversión
- Check: fechas deben mostrarse como "11/11/2025"

### Botón "Limpiar" no funciona
**Síntomas:** En ConsultaCliente, "Limpiar" borra todo en lugar de recargar

**Solución:**
- Ya corregido: `handleLimpiar` llama a `loadClientHDRs()`
- Verificar en código línea ~180 de ConsultaCliente.tsx
- Debe recargar datos del cliente, no limpiar todo

### Service Worker no actualiza
**Solución:**
```bash
# En DevTools:
Application > Storage > Clear site data

# Rebuild y preview:
npm run build && npm run preview
```

### Token de autenticación expirado
**Síntomas:** "Sesión expirada" al consultar

**Solución:**
- Sesiones expiran tras 30 minutos de inactividad
- Hacer logout y volver a autenticar
- Para limpiar manualmente:
```javascript
// En consola del navegador:
localStorage.removeItem('cliente_auth');
localStorage.removeItem('fletero_auth');
localStorage.removeItem('interno_auth');
```

### OCR no detecta números
**Solución:**
- Asegurar foto clara y enfocada
- Número debe estar visible y legible
- Usar el fallback: ingresar manualmente
- Botón "Editar" permite ajustar la imagen antes del OCR

---

## 📄 Documentación Adicional

### Configuración y Setup
- **[GOOGLE-SERVICE-ACCOUNT-SETUP.md](./GOOGLE-SERVICE-ACCOUNT-SETUP.md)** - Service Account completo
- **[N8N-SETUP.md](./N8N-SETUP.md)** - Configuración de webhooks y workflows
- **[NETLIFY-ENV-SETUP.md](./NETLIFY-ENV-SETUP.md)** - Variables de entorno en Netlify

### Deploy y Operaciones
- **[DEPLOY.md](./DEPLOY.md)** - Guía completa de deployment
- **[DEPLOY-NETLIFY-MANUAL.md](./DEPLOY-NETLIFY-MANUAL.md)** - Deploy manual paso a paso

### Cambios y Mejoras
- **[CHANGELOG-SISTEMA-CONSULTAS.md](./CHANGELOG-SISTEMA-CONSULTAS.md)** - Historial de cambios

---

## 🎯 Roadmap Futuro

- [ ] Notificaciones push para alertas en tiempo real
- [ ] Dashboard web administrativo
- [ ] Reportes y analytics avanzados
- [ ] Integración con WhatsApp Business API
- [ ] Modo oscuro para UI
- [ ] Soporte multiidioma (ES/EN)
- [ ] Compresión avanzada de imágenes

---

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para más detalles

---

## 👨‍💻 Autor

**CROSSLOG Team**
- Desarrollado con ❤️ para optimizar la logística
- Powered by React, TypeScript, Capacitor y N8N

---

<div align="center">

**Sistema en producción y funcionando** ✅

[⬆ Volver arriba](#-crosslog---sistema-de-gestión-de-entregas)

</div>
