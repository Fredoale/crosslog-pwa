# 🔐 GOOGLE SERVICE ACCOUNT - CONFIGURACIÓN Y TROUBLESHOOTING

**Fecha:** 2025-01-08
**Estado:** ⚠️ EN PROCESO - Error 403 sin resolver
**Proyecto:** CROSSLOG PWA

---

## 📝 RESUMEN EJECUTIVO

Se implementó Google Service Account para permitir que **cualquier chofer** pueda subir PDFs a Google Drive sin necesidad de autorizar con su cuenta personal de Google. Este es el método profesional usado por empresas.

### ¿Qué es Service Account?

- **Robot automático** que sube archivos a Drive sin interacción del usuario
- **NO requiere popup de autorización** de Google
- **Todos los archivos** se guardan en las carpetas de CROSSLOG
- **Los choferes NO necesitan** cuenta de Google

---

## ✅ COMPLETADO

### 1. Service Account Creado

**Proyecto Google Cloud:** `primeval-falcon-461210-g1`
**Email del Service Account:** `crosslog-drive-uploader@primeval-falcon-461210-g1.iam.gserviceaccount.com`
**ID:** `106874169608276160036`

**Cómo se creó:**
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Create Service Account: `crosslog-drive-uploader`
3. Generate JSON key (archivo descargado: `primeval-falcon-461210-g1-ac46160c9807.json`)

**Links:**
- Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts?project=primeval-falcon-461210-g1
- Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=primeval-falcon-461210-g1 (✅ Habilitada)

---

### 2. Permisos en Google Drive

**Carpetas compartidas con el Service Account** (permiso: **Editor**):
- Remitos Ecolab: `1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ`
- Remitos Toyota
- Remitos Halliburton
- (Todas las carpetas de clientes)

**Cómo compartir una nueva carpeta:**
1. Click derecho en la carpeta → "Compartir"
2. Agregar: `crosslog-drive-uploader@primeval-falcon-461210-g1.iam.gserviceaccount.com`
3. Permiso: **Editor**
4. Desactivar "Notify people"
5. Compartir

---

### 3. Código Implementado

**Archivos modificados:**

#### `src/utils/googleDriveService.ts` (NUEVO)
- Función `uploadToGoogleDrive()` - Sube archivos usando Service Account
- Función `getServiceAccountToken()` - Obtiene token de acceso vía JWT
- Función `createJWT()` - Crea JSON Web Token firmado con RSA-256
- Función `signWithPrivateKey()` - Firma JWT usando Web Crypto API

**Funcionamiento:**
1. Lee credenciales de variables de entorno
2. Crea JWT firmado con private key
3. Intercambia JWT por access token con Google
4. Usa access token para subir archivo a Drive

#### `src/components/CapturaForm.tsx` (MODIFICADO)
- **Eliminado:** OAuth authentication y banners de autorización
- **Reemplazado:** `googleDriveUploader.uploadWithRetry()` por `uploadToGoogleDrive()`
- **Resultado:** Subida automática sin interacción del usuario

---

### 4. Variables de Entorno

**En Netlify** (https://app.netlify.com/sites/appcrosslog/configuration/env):

```
VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL
crosslog-drive-uploader@primeval-falcon-461210-g1.iam.gserviceaccount.com
Scopes: All deploys

VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNsIbRWiiR8BlM\n...(clave completa)...\n-----END PRIVATE KEY-----\n
Scopes: All deploys

SECRETS_SCAN_SMART_DETECTION_ENABLED
false
Scopes: All deploys
```

**En `.env` local** (para desarrollo):

```bash
VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL=crosslog-drive-uploader@primeval-falcon-461210-g1.iam.gserviceaccount.com
VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNsIbRWiiR8BlM\n...(clave completa)...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANTE:** La private key debe tener `\n` como texto literal (no saltos de línea reales).

---

### 5. Configuración de Build

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL = "${VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL}"
  VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "${VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY}"
```

**vite.config.ts:**
```typescript
terserOptions: {
  compress: {
    drop_console: false, // Temporalmente habilitado para debugging
    drop_debugger: true
  }
}
```

**Nota:** `drop_console: false` es temporal para ver logs de debug. Una vez resuelto el problema, cambiar a `true`.

---

## ❌ PROBLEMA ACTUAL

### Error 403 Forbidden

**Síntoma:**
```
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink 403 (Forbidden)

Error en app: "No se pudo subir ningún PDF a Google Drive. Por favor, verifica tu conexión e intenta de nuevo. (1 PDFs fallaron)"
```

**Estado:** SIN RESOLVER

**Diagnóstico realizado:**
- ✅ Service Account existe
- ✅ Carpetas compartidas con permiso Editor
- ✅ Variables configuradas en Netlify
- ✅ Google Drive API habilitada
- ✅ Private key en formato correcto (con `\n`)
- ❌ Logs de `[GoogleDrive]` no aparecían → **Causa:** `drop_console: true` los eliminaba
- ⏳ **Último cambio:** Habilitado `drop_console: false` para ver logs

---

## 🔍 SIGUIENTE PASO (TROUBLESHOOTING)

### CUANDO VUELVAS A TRABAJAR EN ESTO:

1. **Verificar deploy:**
   - https://app.netlify.com/sites/appcrosslog/deploys
   - Estado debe ser "Published"

2. **Probar en producción:**
   - Abrir en modo incógnito: https://appcrosslog.netlify.app
   - Presionar **F12** (consola de Chrome)
   - Iniciar sesión: `crosslog_admin / Crosslog2025!`
   - Completar una entrega (tomar foto, completar datos)

3. **Revisar logs en consola:**

   Deberías ver mensajes como:
   ```
   [GoogleDrive] Getting Service Account token
   [GoogleDrive] Client email configured: true/false
   [GoogleDrive] Client email value: crosslog-drive-uploader@...
   [GoogleDrive] Private key configured: true/false
   [GoogleDrive] Private key starts with: -----BEGIN PRIVATE KEY-----...
   [GoogleDrive] Private key contains newlines: true/false
   ```

4. **Diagnosticar según los logs:**

   **Si NO aparecen logs de `[GoogleDrive]`:**
   - Las variables NO están llegando al código
   - Verificar que el deploy se hizo con `drop_console: false`

   **Si aparecen logs pero dicen "configured: false":**
   - Las variables están vacías
   - Problema con la configuración de Netlify

   **Si aparecen logs de "Token request failed":**
   - El JWT no es válido
   - Problema con la firma de la private key
   - Copiar el error completo para diagnosticar

   **Si aparecen logs de "Upload failed: 403":**
   - El token se obtiene correctamente
   - Pero Google rechaza la subida
   - Puede ser problema de permisos o scope del JWT

---

## 📚 DOCUMENTACIÓN TÉCNICA

### Flujo de Autenticación (Service Account)

```
1. App lee credenciales de env vars
   ↓
2. Crea JWT con:
   - iss: client_email
   - scope: https://www.googleapis.com/auth/drive.file
   - aud: https://oauth2.googleapis.com/token
   - exp: now + 1 hour
   - iat: now
   ↓
3. Firma JWT con private key (RSA-256)
   ↓
4. Envía JWT a Google:
   POST https://oauth2.googleapis.com/token
   grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
   assertion={JWT}
   ↓
5. Google devuelve access_token
   ↓
6. Usa access_token para subir archivo:
   POST https://www.googleapis.com/upload/drive/v3/files
   Authorization: Bearer {access_token}
```

### Formato de Private Key

**Correcto (en variable de entorno):**
```
-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNsIbRWiiR8BlM\nyyrfCRpnlcJbOmjZxxPTbC7TFHoXdS3D4BDqifIH+yAJXJB7iM0KUsmKnyuc4s1Y\n...\n-----END PRIVATE KEY-----\n
```

**Incorrecto:**
```
-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNsIbRWiiR8BlM
yyrfCRpnlcJbOmjZxxPTbC7TFHoXdS3D4BDqifIH+yAJXJB7iM0KUsmKnyuc4s1Y
...
-----END PRIVATE KEY-----
```

**Nota:** Los `\n` deben ser LITERALES (texto), no saltos de línea reales.

---

## 🔧 COMANDOS ÚTILES

### Verificar variables localmente:
```bash
npm run dev
# Abrir http://localhost:5173
# F12 → Consola → Deberías ver logs de [GoogleDrive]
```

### Deploy manual a Netlify:
```bash
git add .
git commit -m "fix: descripción"
git push
# Netlify detecta el push y hace deploy automático
```

### Deploy con limpieza de caché:
1. https://app.netlify.com/sites/appcrosslog/deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"

---

## 🆘 SOLUCIÓN ALTERNATIVA (SI NO SE RESUELVE)

Si el Service Account no funciona después de debugging exhaustivo:

### Opción 1: Usar N8N para subir archivos

1. Enviar PDF en base64 al webhook de N8N
2. N8N sube el archivo a Google Drive usando su propia autenticación
3. N8N devuelve la URL del archivo

**Ventajas:** Funciona sin autenticación en frontend
**Desventajas:** Archivos grandes pueden exceder límite de webhook

### Opción 2: Backend propio

1. Crear backend simple (Node.js/Express)
2. Backend usa Service Account
3. Frontend envía PDF al backend
4. Backend sube a Drive y devuelve URL

**Ventajas:** Control total, debugging más fácil
**Desventajas:** Requiere servidor adicional

---

## 📞 SOPORTE

**Google Cloud Support:**
- Console: https://console.cloud.google.com/support?project=primeval-falcon-461210-g1
- Docs: https://cloud.google.com/iam/docs/service-accounts

**Netlify Support:**
- https://www.netlify.com/support/

**Stack Overflow:**
- Buscar: "Google Service Account 403 Forbidden Drive API"
- Tag: google-drive-api, service-accounts

---

## 📝 HISTORIAL DE CAMBIOS

**2025-01-08 (22:00):**
- ✅ Service Account creado
- ✅ Código implementado
- ✅ Variables configuradas
- ✅ Carpetas compartidas
- ✅ Logs de debug agregados
- ✅ `drop_console: false` habilitado
- ❌ Error 403 persiste

**Próxima acción:** Ver logs en consola para diagnosticar causa exacta del 403.

---

## 🔐 SEGURIDAD

**⚠️ IMPORTANTE:**

1. **NO subir a Git:**
   - `.env` (está en .gitignore)
   - Archivo JSON de credenciales
   - Private keys en commits

2. **Rotar credenciales si se exponen:**
   - https://console.cloud.google.com/iam-admin/serviceaccounts
   - Delete key → Create new key
   - Actualizar en Netlify y `.env`

3. **Límite de permisos:**
   - Service Account solo tiene acceso a carpetas compartidas
   - Scope limitado: `drive.file` (solo archivos que crea)
   - NO puede ver otros archivos de Drive

---

## 📎 ARCHIVOS DE REFERENCIA

- `WHATSAPP-CREDENTIALS.md` - Credenciales de WhatsApp
- `N8N-WHATSAPP-NODO-HTTP.md` - Configuración de N8N
- `NETLIFY-ENV-SETUP.md` - Variables de entorno en Netlify
- `primeval-falcon-461210-g1-ac46160c9807.json` - Credenciales Service Account (NO en Git)

---

**FIN DEL DOCUMENTO**
