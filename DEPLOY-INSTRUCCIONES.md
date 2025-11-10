# 🚀 Instrucciones de Despliegue - Crosslog PWA

**Fecha:** 09/11/2025
**Versión:** 1.1.1
**Build:** ✅ Completado exitosamente

---

## ✅ Build Completado

```bash
npm run build
```

**Resultado:**
- ✅ Build exitoso en 29.60s
- ✅ 16 archivos precacheados (PWA)
- ✅ Service Worker generado: `dist/sw.js`
- ✅ Archivos optimizados y minificados
- ✅ Total size: ~12 MB (incluye PDF, OCR libraries)

---

## 📦 Contenido del Build

```
dist/
├── assets/                       # JavaScript y CSS optimizados
│   ├── index-COV4ltny.css       # 36.95 kB (gzip: 6.28 kB)
│   ├── index-DMLaDHwV.js        # 11.7 MB (gzip: 3.96 MB) - App principal
│   ├── pdf-vendor-BRZ-kHHG.js   # 425 kB - PDF generation
│   ├── db-vendor-CO0KAAoy.js    # 95 kB - IndexedDB
│   ├── ocr-vendor-CsWY9Vvm.js   # 14 kB - OCR
│   └── ... otros chunks
├── index.html                    # HTML principal
├── manifest.webmanifest          # PWA manifest
├── sw.js                         # Service Worker
├── workbox-2d15817a.js          # Workbox runtime
└── icon-192x192.svg             # Iconos de la app
```

---

## 🌐 Opciones de Despliegue

### **Opción 1: Vercel (Recomendado)** ⭐

**Ya está configurado para Vercel**

#### **Despliegue automático desde Git:**

1. **Push a GitHub/GitLab:**
   ```bash
   cd C:\Users\Logis\crosslog-pwa
   git add .
   git commit -m "feat: Toast de confirmación centrado (10s) + Fix OAuth localhost"
   git push origin main
   ```

2. **Vercel despliega automáticamente:**
   - Detecta el push
   - Ejecuta `npm run build`
   - Despliega a producción
   - URL: https://crosslog-pwa.vercel.app (o tu dominio)

#### **Despliegue manual desde CLI:**

```bash
# Si tienes Vercel CLI instalado
npx vercel --prod

# Sigue las instrucciones en pantalla
```

#### **Variables de entorno en Vercel:**

Asegúrate de que estas estén configuradas en el panel de Vercel:

```env
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD8UoubNuqWazSLcjh4bSq36EbFaXcvDB4
VITE_GOOGLE_SPREADSHEET_ID=1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI
VITE_GOOGLE_DRIVE_FOLDER_ID=1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ
VITE_GOOGLE_CLIENT_ID=523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
VITE_N8N_WEBHOOK_URL=https://fredoale.app.n8n.cloud/webhook/crosslog-entregas
VITE_APP_VERSION=1.1.1
VITE_ENVIRONMENT=production
VITE_INTERNAL_USERNAME=crosslog_admin
VITE_INTERNAL_PASSWORD=Crosslog2025!
```

---

### **Opción 2: Netlify**

#### **Drag & Drop:**

1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `dist/` completa
3. Netlify despliega automáticamente
4. Te da una URL: https://random-name-123456.netlify.app

#### **Desde CLI:**

```bash
# Instalar Netlify CLI (si no lo tienes)
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd C:\Users\Logis\crosslog-pwa
netlify deploy --prod --dir=dist
```

#### **Variables de entorno en Netlify:**

Panel de Netlify → Site settings → Environment variables

Agrega las mismas variables que en Vercel (ver arriba).

---

### **Opción 3: GitHub Pages**

**No recomendado para esta app** porque:
- ❌ No soporta variables de entorno server-side
- ❌ Solo archivos estáticos
- ❌ Necesitarías hardcodear las credenciales (inseguro)

---

## 🔧 Verificación Post-Despliegue

Después de desplegar, verifica:

### **1. PWA Funcional:**
- [ ] Abre la app en móvil
- [ ] Chrome muestra "Instalar app" en el menú
- [ ] Funciona offline (cierra datos y recarga)

### **2. OAuth Google:**
- [ ] Intenta subir un PDF
- [ ] Aparece popup de autorización de Google
- [ ] Después de autorizar, sube correctamente

### **3. N8N Webhook:**
- [ ] Completa una entrega
- [ ] Verifica que llegue a N8N
- [ ] Verifica que se escriba en Google Sheets
- [ ] Verifica que se envíe email

### **4. Toast de Confirmación:**
- [ ] Aparece en el **centro** de la pantalla
- [ ] Dura aproximadamente **10 segundos**
- [ ] Texto **grande y legible**
- [ ] Animación zoom suave
- [ ] Se puede cerrar manualmente con [X]

---

## 🐛 Troubleshooting

### **Problema: "Token client not initialized" en producción**

**Causa:** Variable `VITE_GOOGLE_CLIENT_ID` no configurada en el panel de deploy

**Solución:**
1. Ve al panel de Vercel/Netlify
2. Settings → Environment Variables
3. Agrega: `VITE_GOOGLE_CLIENT_ID=523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com`
4. Redeploy

---

### **Problema: "Redirect URI mismatch" en producción**

**Causa:** El dominio de producción no está autorizado en Google Cloud Console

**Solución:**
1. Ve a https://console.cloud.google.com/apis/credentials
2. Edita el OAuth 2.0 Client ID
3. Agrega tu dominio en "Authorized JavaScript origins":
   - Ejemplo: `https://crosslog-pwa.vercel.app`
   - O: `https://tu-dominio-netlify.netlify.app`

---

### **Problema: N8N no recibe los datos**

**Causa:** URL del webhook incorrecta o CORS bloqueado

**Solución:**
1. Verifica la variable: `VITE_N8N_WEBHOOK_URL=https://fredoale.app.n8n.cloud/webhook/crosslog-entregas`
2. Verifica en N8N que el webhook esté **activo**
3. Verifica CORS en N8N (debería permitir tu dominio)

---

## 📊 Métricas del Build

| Aspecto | Valor |
|---------|-------|
| **Tiempo de build** | 29.60s |
| **Archivos generados** | 16 |
| **Tamaño total** | ~12 MB |
| **Tamaño gzipped** | ~4 MB |
| **Chunks** | 10 |
| **Service Worker** | ✅ Generado |
| **PWA ready** | ✅ Sí |

---

## 🎯 Nuevas Funcionalidades en Este Deploy

### **1. Toast de Confirmación Mejorado** ✅
- ✅ Centrado en pantalla (máxima visibilidad)
- ✅ Duración 10 segundos
- ✅ Texto más grande
- ✅ Animación zoom

### **2. OAuth Configurado para Localhost** ✅
- ✅ `VITE_GOOGLE_CLIENT_ID` agregado
- ✅ Funciona tanto en localhost como en producción

### **3. Mejoras de UX** ✅
- ✅ Feedback visual claro al completar entregas
- ✅ Sin errores en localhost
- ✅ Mensajes legibles en móvil

---

## 📝 Changelog - v1.1.1

```markdown
## [1.1.1] - 2025-11-09

### Added
- Toast de confirmación centrado en pantalla
- Duración extendida a 10 segundos
- Texto más grande para mejor legibilidad
- Animación zoom profesional

### Fixed
- Error "Token client not initialized" en localhost
- Agregado VITE_GOOGLE_CLIENT_ID al .env

### Changed
- Posición toast: top → center
- Animación: slide → zoom
- Duración: 5s → 10s
- Tamaño texto: sm → base/lg

### Improved
- Mejor visibilidad del mensaje de confirmación
- UX mejorada para choferes en el campo
```

---

## 🚀 Comandos Rápidos

### **Build local:**
```bash
npm run build
```

### **Preview del build:**
```bash
npm run preview
# Abre http://localhost:4173
```

### **Deploy a Vercel:**
```bash
npx vercel --prod
```

### **Deploy a Netlify:**
```bash
netlify deploy --prod --dir=dist
```

---

## 📋 Checklist Pre-Deploy

- [x] Build exitoso (`npm run build`)
- [x] Sin errores de TypeScript
- [x] Sin errores de ESLint
- [x] Variables de entorno documentadas
- [x] Service Worker generado
- [x] PWA manifest correcto
- [x] Toast de confirmación funcionando
- [x] OAuth configurado
- [x] Documentación actualizada

---

## 🔗 Enlaces Útiles

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Netlify Dashboard:** https://app.netlify.com
- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **N8N Webhook:** https://fredoale.app.n8n.cloud

---

**¡Build completado y listo para desplegar!** 🚀

**Próximo paso:** Push a Git para deploy automático o deploy manual con Vercel CLI.
