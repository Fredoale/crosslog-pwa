# 🚛 CROSSLOG - Sistema de Gestión de Entregas

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)

**Progressive Web App** para gestión de entregas logísticas con captura de fotos, firma digital, OCR de remitos y sincronización offline

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Deploy](#-deploy)

</div>

---

## ✨ Características

### ✅ TODAS LAS FASES COMPLETADAS + SISTEMA DE CONSULTAS

#### 🎯 Fase 1: Funcionalidad Core
- ✅ Login con HDR y validación contra Google Sheets
- ✅ Validación de seguridad con unidad (transporte propio)
- ✅ Lista de entregas con barra de progreso (X/Y)
- ✅ Captura de hasta 7 fotos con cámara nativa
- ✅ Firma digital con canvas táctil
- ✅ Geolocalización automática GPS
- ✅ Persistencia local con IndexedDB (Dexie.js)
- ✅ UI optimizada para campo (botones grandes, alto contraste)

#### 📸 Fase 2: Scanner OCR
- ✅ Reconocimiento de texto con Tesseract.js
- ✅ Auto-detección de número de remito
- ✅ Filtrado inteligente (5 dígitos, sin ceros iniciales)
- ✅ Fallback a ingreso manual

#### 📤 Fase 3: PDFs y Sincronización
- ✅ Generación de PDF individual por foto
- ✅ Firma como segunda página del PDF
- ✅ Upload a Google Drive con OAuth 2.0
- ✅ Retry automático con exponential backoff
- ✅ Webhook N8N con datos completos
- ✅ Cola de sincronización offline

#### 🌐 Fase 4: PWA Completa
- ✅ Service Worker con Workbox
- ✅ Caching estratégico (API + assets)
- ✅ Auto-actualización PWA
- ✅ Instalable como app nativa
- ✅ Build optimizado (code splitting, minificación)
- ✅ Configurado para Android/iOS con Capacitor

#### 🔐 Fase 5: Sistema de Consultas (NUEVO)
- ✅ **Consulta Clientes**: Autenticación con código de acceso
  - Búsqueda por HDR o número de remito
  - Visualización de entregas completadas/pendientes
  - Acceso a PDFs de remitos conformados
  - Sistema de seguridad: 5 intentos fallidos → 15 min de bloqueo
  - Persistencia de sesión (30 minutos)

- ✅ **Consulta Fleteros**: Autenticación por empresa
  - Visualización de viajes completados/en curso
  - Filtrado por empresa de transporte
  - Historial de entregas realizadas
  - Acceso a documentación de viajes
  - Persistencia de sesión (30 minutos)

- ✅ **Consulta Interna**: Acceso administrativo
  - Búsqueda avanzada (HDR, remito, fletero)
  - Filtro por tipo de transporte (incluye PROPIO)
  - Vista completa de todas las operaciones
  - Resumen ejecutivo con estadísticas
  - Persistencia de sesión (30 minutos)

- ✅ **Detalles de Viaje**:
  - Resumen con estadísticas (total, completadas, pendientes, progreso %)
  - Lista detallada de entregas con estado visual
  - Links directos a PDFs de remitos
  - Información de firma y receptor
  - Datos de geolocalización

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| **Frontend** | React 19.1, TypeScript 5.7, Vite 7.1, Tailwind CSS 4 |
| **State** | Zustand con persistencia |
| **Storage** | Dexie.js (IndexedDB), Google Sheets API v4 |
| **Files** | Google Drive API v3, pdf-lib |
| **Mobile** | Capacitor 6, Camera, Geolocation |
| **PWA** | Workbox, vite-plugin-pwa |
| **OCR** | Tesseract.js |
| **Auth** | Google OAuth 2.0 |

---

## 🚀 Instalación

### Requisitos
- Node.js 18+ (v20 recomendado)
- npm o yarn
- Git

### Setup Rápido

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/crosslog-pwa.git
cd crosslog-pwa

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar
npm run dev
```

### Configuración Completa

Ver documentación detallada:
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Configurar OAuth 2.0
- **[DEPLOY.md](./DEPLOY.md)** - Guía de deploy completa

---

## 💻 Comandos

```bash
# Desarrollo
npm run dev                # Servidor de desarrollo

# Build
npm run build             # Build de producción
npm run preview           # Preview del build

# Mobile (Android)
npx cap sync android      # Sincronizar
npx cap open android      # Abrir Android Studio

# Mobile (iOS)
npx cap sync ios          # Sincronizar
npx cap open ios          # Abrir Xcode
```

---

## 📱 Uso

### 🚚 Modo Chofer (Captura de Entregas)

#### 1. Login
- Ingresar HDR (ej: 7372022)
- Nombre del chofer
- **Validación de seguridad**: Seleccionar unidad correcta (solo transporte propio)
- Click "Iniciar Entregas"

#### 2. Lista de Entregas
- Ver progreso (X/Y completadas)
- Click "Iniciar HDR"

#### 3. Capturar
**Opción A: OCR**
- Click "📸 Escanear Remito"
- Tomar foto del número
- Auto-completa

**Opción B: Manual**
- Ingresar número manualmente

**Fotos**
- Click "📷 Tomar Foto" (hasta 7)

**Firma**
- Click "✍️ Agregar Firma"
- Dibujar + nombre receptor

#### 4. Finalizar
- Click "Finalizar y Enviar"
- Ver progreso:
  - Generando PDFs...
  - Subiendo a Drive...
  - Enviando a N8N...

---

### 👥 Modo Consulta (Clientes/Fleteros/Interno)

#### Consulta Clientes
1. Seleccionar "Consulta Clientes"
2. Ingresar código de acceso (ej: ABC2024XY)
3. Buscar por:
   - **HDR**: Número de viaje
   - **Remito**: Número de remito
4. Ver detalles con PDFs de remitos conformados
5. Sesión activa por 30 minutos

#### Consulta Fleteros
1. Seleccionar "Consulta Fleteros"
2. Ingresar código de empresa (ej: XYZ2024AB)
3. Ver viajes completados y en curso
4. Acceder a documentación de entregas
5. Sesión activa por 30 minutos

#### Consulta Interna
1. Seleccionar "Consulta Interna"
2. Ingresar credenciales administrativas
3. Búsqueda avanzada:
   - Por HDR
   - Por número de remito
   - Por fletero/empresa (incluye PROPIO)
4. Vista completa con resumen ejecutivo
5. Sesión activa por 30 minutos

---

## 🌐 Deploy

### Web (Netlify)
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Android
```bash
npm run build
npx cap sync android
npx cap open android
# Build > Generate Signed Bundle
```

### iOS
```bash
npm run build
npx cap sync ios
npx cap open ios
# Product > Archive
```

Ver guía completa: **[DEPLOY.md](./DEPLOY.md)**

---

## 📊 Datos del Webhook N8N

```json
{
  "hdr": "708090",
  "numero_entrega": "001",
  "numero_remito": "38269",
  "cliente": "ECO",
  "cliente_nombre_completo": "ECOLAB",
  "detalle_entregas": "Punto A, Punto B",
  "estado": "COMPLETADO",
  "chofer": "Juan Perez",
  "timestamp": "2025-10-15T10:30:00Z",
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
  "numero_fotos": 2,
  "version_app": "1.0.0"
}
```

---

## 🗂️ Estructura

```
crosslog-pwa/
├── src/
│   ├── components/         # React components
│   │   ├── Login.tsx             # Login choferes (HDR + validación)
│   │   ├── EntregasList.tsx      # Lista de entregas
│   │   ├── CapturaForm.tsx       # Captura fotos/firma
│   │   ├── SignatureCanvas.tsx   # Canvas de firma
│   │   ├── AuthCliente.tsx       # Autenticación clientes
│   │   ├── AuthFletero.tsx       # Autenticación fleteros
│   │   ├── AuthInterno.tsx       # Autenticación interna
│   │   ├── ConsultaCliente.tsx   # Consulta para clientes
│   │   ├── ConsultaFletero.tsx   # Consulta para fleteros
│   │   ├── ConsultaInterna.tsx   # Consulta administrativa
│   │   └── DetalleViaje.tsx      # Detalle completo de HDR
│   ├── db/                 # IndexedDB
│   │   └── offlineDb.ts
│   ├── hooks/             # React hooks
│   │   ├── useGeolocation.ts
│   │   └── useOfflineSync.ts
│   ├── stores/            # Zustand stores
│   │   └── entregasStore.ts
│   ├── utils/             # Utilities
│   │   ├── googleAuth.ts          # OAuth 2.0
│   │   ├── googleDriveUpload.ts   # Upload PDFs
│   │   ├── ocrScanner.ts          # Tesseract OCR
│   │   ├── pdfGenerator.ts        # Generación PDFs
│   │   └── sheetsApi.ts           # Google Sheets API
│   └── types/             # TypeScript types
├── public/                # Static assets
├── android/               # Android app
├── ios/                   # iOS app
└── capacitor.config.ts
```

---

## 🔧 Solución de Problemas

### Service Worker no registra
```bash
# DevTools > Application > Clear storage
npm run build && npm run preview
```

### OAuth redirect error
- Verificar Client ID en `.env`
- Verificar origen en Google Cloud Console
- Usar `http://localhost:5173` exacto

### PDFs no suben
- Verificar permisos de carpeta Drive
- Check consola para errores OAuth

### OCR no detecta
- Foto clara y enfocada
- Número visible
- Fallback: ingreso manual

---

## 📄 Licencia

MIT License

---

<div align="center">

**Hecho con ❤️ para optimizar la logística**

[⬆ Volver arriba](#-crosslog---sistema-de-gestión-de-entregas)

</div>
