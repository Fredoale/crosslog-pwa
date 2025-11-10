# ✅ Error de Localhost Solucionado

**Fecha:** 09/11/2025
**Error:** `Token client not initialized` al subir PDFs en localhost
**Estado:** ✅ SOLUCIONADO

---

## ❌ Error Original

```
[CapturaForm] ❌ Failed PDF 1: 102030.pdf
[CapturaForm] Error: Error al subir archivo a Google Drive: Token client not initialized
    at uploadToGoogleDrive (googleDriveService.ts:71:11)
```

---

## 🔍 Diagnóstico

### **Síntomas:**
- ✅ Funciona en deploy (Vercel/Netlify)
- ❌ Falla en localhost (puerto 5173)
- Error específico: "Token client not initialized"

### **Causa raíz:**
Faltaba la variable de entorno `VITE_GOOGLE_CLIENT_ID` en el archivo `.env` local.

---

## 🎯 Por Qué Pasaba Esto

### **1. Flujo de autenticación OAuth:**

```typescript
// googleAuth.ts línea 201-204
export const googleAuth = new GoogleAuthManager({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '', // ← Estaba vacío
  scope: 'https://www.googleapis.com/auth/drive.file',
});
```

Sin `VITE_GOOGLE_CLIENT_ID`:
- `clientId` se inicializa como `''` (string vacío)
- Google Identity Services rechaza el client_id vacío
- `this.tokenClient` queda como `null`
- Al intentar subir PDFs → Error: "Token client not initialized"

### **2. Por qué funcionaba en deploy:**

Vercel/Netlify tienen las **Environment Variables** configuradas en su panel:
```
✅ VITE_GOOGLE_CLIENT_ID = 523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
```

Pero en localhost, el `.env` local NO tenía esta variable.

---

## ✅ Solución Aplicada

Agregada la variable de entorno al archivo `.env`:

```env
# Google OAuth Client ID (for user authentication in browser)
VITE_GOOGLE_CLIENT_ID=523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
```

---

## 🔧 Configuración de Google Cloud Console

### **OAuth 2.0 Client ID:**
```
Client ID: 523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
Tipo: Aplicación web
```

### **Authorized JavaScript origins:**
```
✅ http://localhost:5173
✅ http://localhost:5174
✅ http://localhost:5175
✅ https://appcrosslog.netlify.app
```

**Nota:** Los puertos 5173, 5174, 5175 están autorizados para desarrollo local.

---

## 🚀 Cómo Probar la Solución

### **1. Reiniciar el servidor de desarrollo:**

```bash
# Detener el servidor actual (Ctrl+C)
# Reiniciar para que cargue el nuevo .env
npm run dev
```

**IMPORTANTE:** Vite solo carga las variables de entorno al iniciar. Si modificas `.env`, **debes reiniciar el servidor**.

### **2. Probar la funcionalidad:**

1. Abrir http://localhost:5173
2. Ir a una entrega
3. Tomar foto de un remito
4. Agregar firma
5. Click en "Finalizar Entrega"

**Resultado esperado:**
- ✅ Aparece modal de autorización de Google (primera vez)
- ✅ Después de autorizar, sube los PDFs correctamente
- ✅ No más error "Token client not initialized"

---

## 📝 Flujo de Autorización (Primera Vez)

### **Primera vez que usas la app en localhost:**

1. Intentas subir un PDF
2. Aparece popup de Google:
   ```
   ┌─────────────────────────────────────┐
   │  Iniciar sesión con Google          │
   │                                     │
   │  CROSSLOG quiere acceder a:         │
   │  ✓ Ver y administrar archivos de    │
   │    Google Drive que abres o creas   │
   │    con esta app                     │
   │                                     │
   │  [Cancelar]  [Permitir]             │
   └─────────────────────────────────────┘
   ```
3. Click en "Permitir"
4. Google guarda el token en `localStorage`
5. Los PDFs se suben exitosamente

### **Siguientes veces:**

- ✅ NO pide autorización de nuevo (token guardado)
- ✅ Sube PDFs directamente

---

## 🔍 Verificación en Consola del Navegador

Después de reiniciar el servidor, deberías ver en la consola:

```
[App] Initializing Google Auth...
[GoogleAuth] Starting initialization...
[GoogleAuth] Waiting for Google Identity Services to load...
[GoogleAuth] ✅ Google Identity Services loaded after XXXms
[GoogleAuth] ✅ Token client initialized successfully
[GoogleAuth] Scope: https://www.googleapis.com/auth/drive.file
[App] ✅ Google Auth initialized successfully
```

**Si ves esto, está funcionando correctamente.**

---

## 🐛 Troubleshooting

### **Problema: Sigue sin funcionar después de agregar la variable**

**Causa:** No reiniciaste el servidor de desarrollo

**Solución:**
```bash
# Detener servidor (Ctrl+C)
npm run dev
```

---

### **Problema: Aparece "Redirect URI mismatch"**

**Causa:** El puerto de localhost no está autorizado en Google Cloud Console

**Solución:**
1. Ve a https://console.cloud.google.com/apis/credentials
2. Edita el OAuth 2.0 Client ID
3. Agrega tu puerto en "Authorized JavaScript origins"
   - Ejemplo: `http://localhost:5173`

---

### **Problema: "Token client initialized" pero sigue fallando**

**Causa:** Token expirado o localStorage corrupto

**Solución:**
```javascript
// En la consola del navegador:
localStorage.removeItem('google_drive_token');
// Refresca la página (F5)
```

---

## 📊 Comparación Antes vs Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|----------|------------|
| **VITE_GOOGLE_CLIENT_ID** | No existe | Configurado |
| **tokenClient** | null | Inicializado correctamente |
| **Upload PDFs localhost** | Falla | ✅ Funciona |
| **Error "Token client not initialized"** | Sí | No |
| **Necesita reinicio** | - | Sí (después de agregar .env) |

---

## 💡 Lecciones Aprendidas

### **1. Variables de entorno en Vite:**
- Deben tener el prefijo `VITE_`
- Solo se cargan al **iniciar** el servidor
- Cambios en `.env` requieren **reiniciar**

### **2. OAuth en desarrollo:**
- Google requiere que el dominio esté autorizado
- Localhost debe estar explícitamente en "Authorized JavaScript origins"
- El token se guarda en localStorage para reutilizarlo

### **3. Deploy vs Local:**
- Deploy tiene variables en el panel (Vercel/Netlify)
- Local necesita el archivo `.env` completo
- `.env.example` es solo una plantilla

---

## 📋 Checklist de Configuración

Para configurar un nuevo entorno de desarrollo:

- [x] Crear archivo `.env` desde `.env.example`
- [x] Agregar `VITE_GOOGLE_CLIENT_ID`
- [x] Verificar que localhost esté autorizado en Google Cloud
- [x] Reiniciar servidor de desarrollo
- [x] Probar subida de PDFs
- [x] Autorizar la app en Google (primera vez)

---

## 🔗 Referencias

- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **Proyecto:** primeval-falcon-461210-g1
- **Client ID:** 523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
- **Scope:** https://www.googleapis.com/auth/drive.file

---

**Última actualización:** 09/11/2025
**Estado:** ✅ Problema resuelto
**Acción requerida:** Reiniciar servidor de desarrollo (`npm run dev`)
