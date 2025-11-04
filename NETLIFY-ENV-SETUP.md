# 🚀 CONFIGURACIÓN DE VARIABLES DE ENTORNO EN NETLIFY

**IMPORTANTE:** Netlify NO lee el archivo `.env` automáticamente. Debes configurar las variables manualmente en su dashboard.

---

## 📍 PASO 1: Ir a la Configuración de Netlify

1. Ve a: https://app.netlify.com/sites/appcrosslog/configuration/env
2. Click en **"Add a variable"** o **"Edit variables"**

---

## 📋 PASO 2: Copiar TODAS estas Variables

Copia y pega cada variable exactamente como aparece:

### Google Sheets API
```
Key: VITE_GOOGLE_SHEETS_API_KEY
Value: AIzaSyD8UoubNuqWazSLcjh4bSq36EbFaXcvDB4
```

```
Key: VITE_GOOGLE_SPREADSHEET_ID
Value: 1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI
```

### Google Drive
```
Key: VITE_GOOGLE_DRIVE_FOLDER_ID
Value: 1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ
```

### Google OAuth 2.0
```
Key: VITE_GOOGLE_CLIENT_ID
Value: 523970559904-61b546cq0t6mbnigfg8ln58nce147hm1.apps.googleusercontent.com
```

### N8N Webhook ⚠️ CRÍTICO - Asegúrate que diga /webhook/ NO /webhook-test/
```
Key: VITE_N8N_WEBHOOK_URL
Value: https://fredoale.app.n8n.cloud/webhook/crosslog-entregas
```

### App Configuration
```
Key: VITE_APP_VERSION
Value: 1.0.0
```

```
Key: VITE_ENVIRONMENT
Value: production
```

### Internal Access
```
Key: VITE_INTERNAL_USERNAME
Value: crosslog_admin
```

```
Key: VITE_INTERNAL_PASSWORD
Value: Crosslog2025!
```

---

## 📋 PASO 3: Guardar y Verificar

1. **Guarda todas las variables**
2. Verifica especialmente que `VITE_N8N_WEBHOOK_URL` diga:
   - ✅ CORRECTO: `webhook/crosslog-entregas`
   - ❌ INCORRECTO: `webhook-test/crosslog-entregas`

---

## 🔄 PASO 4: Trigger Deploy

1. Ve a: https://app.netlify.com/sites/appcrosslog/deploys
2. Click en: **"Trigger deploy"**
3. Selecciona: **"Clear cache and deploy site"**
4. Espera 2-3 minutos

---

## ✅ PASO 5: Verificar que Funciona

Una vez que el deploy termine:

1. Abre la consola de Chrome (F12)
2. Ve a la pestaña **Network**
3. Haz una entrega de prueba
4. Busca la petición a `fredoale.app.n8n.cloud`
5. Verifica que la URL sea: `/webhook/crosslog-entregas` (NO `/webhook-test/`)
6. Si ves status 200 OK → ✅ Funciona

---

## 🔍 TROUBLESHOOTING

### Problema: Sigue enviando a /webhook-test/
**Solución:**
1. Verifica que la variable en Netlify esté escrita EXACTAMENTE como arriba
2. Haz "Clear cache and deploy site" (no solo "Deploy site")
3. Espera a que termine el deploy completamente

### Problema: Variables no se aplican
**Solución:**
1. Las variables solo se aplican en el PRÓXIMO deploy
2. Si ya hiciste cambios, haz un nuevo deploy
3. Netlify tarda ~2-3 minutos en aplicar cambios

---

## 📝 NOTA IMPORTANTE

**Diferencia entre archivos:**

- **`.env`** → Desarrollo local (tu computadora)
- **`.env.example`** → Template de referencia (subido a Git)
- **Netlify Dashboard** → Variables de producción (configuración manual)

Los tres deben tener los MISMOS valores para que funcione correctamente.

---

## 🆘 SI NADA FUNCIONA

1. Exporta todas las variables actuales de Netlify (por si acaso)
2. **Borra TODAS las variables** en Netlify
3. Copia y pega de nuevo TODAS las variables de arriba
4. Guarda
5. "Clear cache and deploy site"
6. Espera 5 minutos
7. Prueba de nuevo
