# 🚀 Manual de Deploy a Netlify - CROSSLOG PWA

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
- ✅ Cuenta en GitHub, GitLab o Bitbucket
- ✅ Cuenta en Netlify (gratis en https://app.netlify.com)
- ✅ Código del proyecto subido a un repositorio Git
- ✅ Variables de entorno (.env) guardadas en un lugar seguro

---

## 🔄 PASO 1: Subir Código a Repositorio Git (Si aún no lo hiciste)

### Opción A: GitHub Desktop (Más Fácil)

1. **Descargar GitHub Desktop:**
   - Ve a https://desktop.github.com
   - Descarga e instala

2. **Crear Repositorio:**
   - Abre GitHub Desktop
   - Click en **"File" → "Add Local Repository"**
   - Selecciona la carpeta: `C:\Users\Logis\crosslog-pwa`
   - Click **"Create Repository"**

3. **Publicar:**
   - Click en **"Publish repository"**
   - Nombre: `crosslog-pwa`
   - ⚠️ **IMPORTANTE**: Desmarca ✅ "Keep this code private" si quieres público, o déjalo marcado para privado
   - Click **"Publish repository"**

### Opción B: Git Command Line

```bash
cd C:\Users\Logis\crosslog-pwa

# Inicializar Git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Crear commit
git commit -m "Initial commit - CROSSLOG PWA ready for deployment"

# Crear repositorio en GitHub y seguir instrucciones
# O usar estos comandos (reemplaza TU_USUARIO):
git remote add origin https://github.com/TU_USUARIO/crosslog-pwa.git
git branch -M main
git push -u origin main
```

---

## 🌐 PASO 2: Conectar Netlify con Git

### 1. Ir a Netlify Dashboard

- Ve a: https://app.netlify.com
- Haz login con tu cuenta (o crea una nueva)

### 2. Agregar Nuevo Site

- Click en el botón verde **"Add new site"**
- Selecciona **"Import an existing project"**

### 3. Conectar Git Provider

Verás 3 opciones:

```
┌─────────────────────────────────────┐
│  Deploy with GitHub                 │  ← Selecciona este
├─────────────────────────────────────┤
│  Deploy with GitLab                 │
├─────────────────────────────────────┤
│  Deploy with Bitbucket              │
└─────────────────────────────────────┘
```

- Click en **"Deploy with GitHub"** (o el que uses)
- Autoriza a Netlify acceder a tu GitHub

### 4. Seleccionar Repositorio

- Verás una lista de tus repositorios
- Busca: **"crosslog-pwa"**
- Click en el repositorio

### 5. Configurar Build Settings

Netlify detectará automáticamente la configuración del archivo `netlify.toml`, pero verifica:

```
Branch to deploy:     main  ✓
Build command:        npm run build  ✓
Publish directory:    dist  ✓
```

⚠️ **NO HAGAS CLICK EN "DEPLOY" TODAVÍA** - Primero hay que agregar variables de entorno

---

## 🔐 PASO 3: Agregar Variables de Entorno

### 1. Ir a Site Settings

- **ANTES** de hacer deploy, click en **"Site settings"** (o "Advanced" durante el setup)
- Si ya desplegaste, ve a: **Site settings → Environment variables**

### 2. Agregar Variables Una por Una

Click en **"Add environment variable"** y agrega las siguientes:

#### Variable 1: Google Client ID
```
Key:    VITE_GOOGLE_CLIENT_ID
Value:  [Tu Client ID de Google OAuth]
```
**Ejemplo:** `1234567890-abcdefghijklmnop.apps.googleusercontent.com`

#### Variable 2: Google API Key
```
Key:    VITE_GOOGLE_API_KEY
Value:  [Tu API Key de Google]
```
**Ejemplo:** `AIzaSyC1234567890abcdefghijklmnopqrst`

#### Variable 3: Spreadsheet ID
```
Key:    VITE_SPREADSHEET_ID
Value:  [ID de tu Google Sheet]
```
**Ejemplo:** `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t`

#### Variable 4: N8N Webhook URL
```
Key:    VITE_N8N_WEBHOOK_URL
Value:  [URL completa de tu webhook N8N]
```
**Ejemplo:** `https://n8n.example.com/webhook/crosslog-entregas`

#### Variable 5: Usuario Interno
```
Key:    VITE_INTERNO_USER
Value:  [Usuario para Consulta Interna]
```
**Ejemplo:** `admin_crosslog`

#### Variable 6: Contraseña Interna
```
Key:    VITE_INTERNO_PASS
Value:  [Contraseña para Consulta Interna]
```
**Ejemplo:** `CroSsL0g2024!Secure`

### 3. Verificar Variables

Al final deberías tener 6 variables:

```
✓ VITE_GOOGLE_CLIENT_ID
✓ VITE_GOOGLE_API_KEY
✓ VITE_SPREADSHEET_ID
✓ VITE_N8N_WEBHOOK_URL
✓ VITE_INTERNO_USER
✓ VITE_INTERNO_PASS
```

---

## 🚀 PASO 4: Desplegar!

### 1. Iniciar Deploy

- Ve a: **Deploys** tab
- Click en **"Trigger deploy"** → **"Deploy site"**

O si estás en el setup inicial:
- Click en el botón verde **"Deploy [nombre-del-site]"**

### 2. Esperar Build

Verás el progreso en tiempo real:

```
┌─────────────────────────────────────┐
│ 🔨 Building...                      │
│                                     │
│ 1. Installing dependencies         │ ✓
│ 2. Running npm run build           │ ✓
│ 3. Packaging files                 │ ✓
│ 4. Deploying to CDN                │ ⏳
└─────────────────────────────────────┘
```

**Tiempo estimado:** 2-5 minutos

### 3. Deploy Completado ✅

Cuando termine verás:

```
🎉 Site is live!

Your site URL:
https://[random-name].netlify.app
```

---

## 🎨 PASO 5: Personalizar Dominio (Opcional)

### Cambiar Nombre del Site

1. Ve a: **Site settings → General → Site details**
2. Click en **"Change site name"**
3. Ingresa: `crosslog-pwa` (o el nombre que prefieras)
4. Tu URL será: `https://crosslog-pwa.netlify.app`

### Agregar Dominio Personalizado (Opcional)

Si tienes un dominio propio (ej: `app.crosslog.com`):

1. Ve a: **Domain management → Domains**
2. Click **"Add domain"**
3. Ingresa tu dominio: `app.crosslog.com`
4. Sigue las instrucciones para configurar DNS

---

## ✅ PASO 6: Verificar Funcionamiento

### 1. Abrir la App

- Ve a la URL: `https://[tu-site].netlify.app`
- Deberías ver la pantalla de selección de CROSSLOG

### 2. Probar Funcionalidades

**Prueba 1: Modo Chofer**
- ✅ Login con HDR funciona
- ✅ Validación de unidad funciona

**Prueba 2: Consulta Cliente**
- ✅ Login con código funciona
- ✅ Búsqueda de HDR muestra resultados

**Prueba 3: Consulta Fletero**
- ✅ Login con código funciona
- ✅ Lista de viajes carga correctamente

**Prueba 4: Consulta Interna**
- ✅ Login con usuario/contraseña funciona
- ✅ Búsquedas avanzadas funcionan

### 3. Verificar PWA

**En móvil:**
- Chrome/Edge: Debería aparecer "Agregar a pantalla de inicio"
- Safari (iOS): Compartir → "Agregar a pantalla de inicio"

**En desktop:**
- Chrome: Ícono de + en la barra de direcciones

---

## 🔄 PASO 7: Actualizaciones Futuras

### Deploy Automático

Netlify está configurado para auto-deploy cuando hagas cambios:

```bash
# Haces un cambio en el código
git add .
git commit -m "Descripción del cambio"
git push

# Netlify automáticamente:
# 1. Detecta el push
# 2. Hace build
# 3. Deploys la nueva versión
# ⏱️ En 2-5 minutos está en producción
```

### Deploy Manual

Si necesitas redesplegar sin cambios:
1. Ve a **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**

---

## 🎯 URLs Importantes Post-Deploy

Una vez desplegado, tendrás estas URLs:

### Para Choferes (Modo Captura):
```
https://crosslog-pwa.netlify.app/#/login
```

### Para Clientes:
```
https://crosslog-pwa.netlify.app/#/consulta-cliente
```

### Para Fleteros:
```
https://crosslog-pwa.netlify.app/#/consulta-fletero
```

### Para Staff Interno:
```
https://crosslog-pwa.netlify.app/#/consulta-interna
```

### Página Principal:
```
https://crosslog-pwa.netlify.app
```

---

## 🔧 Solución de Problemas

### Error: "Build failed"

**Problema:** El build falla en Netlify
**Solución:**
1. Verifica que todas las variables de entorno estén correctas
2. Ve a **Deploys → [Failed deploy] → Deploy log**
3. Busca el error específico en los logs

### Error: "Page not found"

**Problema:** Al entrar a rutas específicas da 404
**Solución:** Verifica que el archivo `netlify.toml` esté en la raíz del proyecto

### Error: "API Key inválido"

**Problema:** Google Sheets no carga datos
**Solución:**
1. Ve a **Site settings → Environment variables**
2. Verifica que `VITE_GOOGLE_API_KEY` sea correcto
3. Re-deploy después de corregir

### Error: "OAuth redirect_uri mismatch"

**Problema:** Google OAuth no funciona
**Solución:**
1. Ve a Google Cloud Console
2. Credenciales → OAuth 2.0 Client IDs
3. Agregar URI autorizado: `https://[tu-site].netlify.app`

---

## 📊 Monitoreo

### Analytics de Netlify (Incluido)

Ve a **Analytics** para ver:
- 📈 Visitantes únicos
- 📍 Geolocalización de usuarios
- 🔗 Páginas más visitadas
- ⏱️ Tiempo de carga

### Logs en Tiempo Real

Ve a **Functions** → **Logs** para ver:
- Errores de build
- Problemas de runtime
- Requests fallidos

---

## 💾 Backup y Rollback

### Volver a Versión Anterior

Si algo sale mal:
1. Ve a **Deploys**
2. Encuentra el deploy que funcionaba
3. Click en **"..."** → **"Publish deploy"**
4. ¡Vuelves a la versión anterior en segundos!

---

## 🎉 ¡Listo!

Tu CROSSLOG PWA está ahora en producción y disponible 24/7 en internet.

**¿Necesitas ayuda?**
- Documentación Netlify: https://docs.netlify.com
- Soporte: https://answers.netlify.com

---

<div align="center">

**CROSSLOG PWA - Desplegado con éxito**

URL: `https://[tu-site].netlify.app`

</div>
