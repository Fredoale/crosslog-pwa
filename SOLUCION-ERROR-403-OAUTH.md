# 🔒 Solución Error 403: access_denied - OAuth Google

**Fecha:** 09/11/2025
**Error:** `Error 403: access_denied`
**Causa:** App en modo "Testing" con usuarios limitados
**Estado:** ⚠️ Requiere acción

---

## ❌ Error Completo

```
appcrosslog.netlify.app no ha completado el proceso de verificación de Google.
En estos momentos, la app se está probando y solo pueden acceder a ella
los testers aprobados por el desarrollador.

Error 403: access_denied
```

---

## 🔍 ¿Por Qué Sucede?

Tu app OAuth está en **modo "Testing"**, que tiene estas restricciones:

- ❌ Solo usuarios agregados manualmente como "test users"
- ❌ Límite de 100 usuarios
- ❌ Tokens expiran cada 7 días
- ❌ Otros usuarios ven error 403

**Esto es normal** cuando creas credenciales OAuth por primera vez.

---

## ✅ SOLUCIÓN 1: Publicar la App (RECOMENDADO)

### **¿Por qué publicar?**

- ✅ **Cualquier usuario** con cuenta Google puede usar la app
- ✅ **Sin límite** de usuarios
- ✅ Tokens **no expiran** cada 7 días
- ✅ **NO requiere verificación de Google** (tu scope es restringido)

### **Pasos para publicar:**

#### **1. Ir a OAuth consent screen**
```
https://console.cloud.google.com/apis/credentials/consent
```

O navega:
- Google Cloud Console
- Tu proyecto: `primeval-falcon-461210-g1`
- APIs & Services → **OAuth consent screen**

#### **2. Verificar tu configuración actual**

Deberías ver algo como:

```
App name: CROSSLOG
User support email: tu-email@gmail.com
Publishing status: Testing ← ESTO ES LO QUE CAMBIAREMOS
```

#### **3. Click en "PUBLISH APP"**

Verás un botón grande que dice:
```
[PUBLISH APP]
```

Click en él.

#### **4. Confirmar publicación**

Google te mostrará un diálogo:

```
Publish app?

Your app will be available to any user with a Google Account.

You are using restricted scopes that do not require verification.

[CANCEL]  [PUBLISH]
```

Click en **"PUBLISH"**.

#### **5. ¡Listo!**

Después de publicar:

```
Publishing status: In production ✅
```

**Tiempo de propagación:** 5-10 minutos

---

## ✅ SOLUCIÓN 2: Agregar Test Users (Temporal)

Si solo necesitas que algunos usuarios específicos usen la app ahora mismo:

### **Pasos:**

#### **1. Ir a OAuth consent screen**
```
https://console.cloud.google.com/apis/credentials/consent
```

#### **2. Scroll hasta "Test users"**

Verás:
```
Test users
Add the email addresses of users that can test your app

[+ ADD USERS]
```

#### **3. Click "+ ADD USERS"**

Aparecerá un campo de texto.

#### **4. Agregar correos electrónicos**

Agrega los correos uno por uno:

```
chofer1@gmail.com
chofer2@gmail.com
admin@crosslog.com
...
```

**Importante:**
- Usa el correo de la **cuenta Google** que usarán (Gmail o Google Workspace)
- Máximo 100 usuarios
- Un correo por línea

#### **5. Save**

Los usuarios agregados podrán usar la app **inmediatamente** (sin esperar).

---

## 🎯 ¿Cuál Opción Elegir?

### **Usa SOLUCIÓN 1 (Publicar) si:**
- ✅ Tienes más de 100 usuarios potenciales
- ✅ No quieres agregar correos manualmente
- ✅ Quieres que cualquiera pueda usar la app
- ✅ Es tu solución final (producción)

**→ RECOMENDADO para Crosslog**

### **Usa SOLUCIÓN 2 (Test Users) si:**
- Solo algunos usuarios específicos la usarán (< 100)
- Necesitas acceso inmediato mientras decides publicar
- Quieres mantener control estricto de quién accede

---

## 🔐 ¿Por Qué No Requiere Verificación de Google?

Tu app usa el scope:

```
https://www.googleapis.com/auth/drive.file
```

Este es un **scope restringido** (no sensible) que:

- ✅ Solo accede a archivos que **la app misma crea**
- ✅ NO puede leer archivos existentes del usuario
- ✅ NO requiere revisión de seguridad de Google

Por eso puedes publicar sin verificación. 🎉

---

## 📋 Scopes que Requieren Verificación vs No

### **No Requieren Verificación** ✅ (TU CASO)
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.appdata
```

### **Requieren Verificación** ❌
```
https://www.googleapis.com/auth/drive           (acceso completo)
https://www.googleapis.com/auth/drive.readonly  (leer todo)
https://www.googleapis.com/auth/gmail.send      (enviar emails)
```

---

## 🧪 Cómo Probar Después de Publicar

### **1. Espera 5-10 minutos**
Después de publicar, Google tarda un poco en propagar los cambios.

### **2. Abre la app en incógnito**
```
Ctrl + Shift + N (Chrome)
```

### **3. Accede a la app**
```
https://appcrosslog.netlify.app
```

### **4. Intenta subir un PDF**
- Con un correo que **NO esté** en test users
- Debería funcionar sin error 403

---

## 🔍 Verificar Estado Actual

Para ver si está publicada:

1. Ve a OAuth consent screen
2. Busca: **Publishing status**
3. Debería decir:
   - **"Testing"** → Aún no publicada
   - **"In production"** → ✅ Publicada

---

## 💡 Mejores Prácticas

### **Para Producción:**
1. ✅ Publicar la app (Solución 1)
2. ✅ Mantener el scope restringido (`drive.file`)
3. ✅ Usar dominio propio si es posible
4. ✅ Actualizar política de privacidad si es necesario

### **Para Desarrollo:**
1. ✅ Usar test users (Solución 2)
2. ✅ Agregar solo correos de tu equipo
3. ✅ Publicar cuando estés listo para producción

---

## 🐛 Troubleshooting

### **Problema: Sigue mostrando error 403 después de publicar**

**Causa:** Cache del navegador o propagación de Google

**Solución:**
1. Espera 10-15 minutos
2. Limpia cookies de Google:
   - Chrome: Settings → Privacy → Cookies → See all cookies
   - Busca "google.com" y "accounts.google.com"
   - Remove all
3. Cierra el navegador completamente
4. Abre en incógnito e intenta de nuevo

---

### **Problema: "App no verificada" warning**

**Aparece:**
```
Esta app no ha sido verificada por Google
[Ir atrás]  [Avanzado]
```

**Solución:**
1. Click en "Avanzado"
2. Click en "Ir a appcrosslog.netlify.app (no seguro)"
3. Es normal para apps que usan scopes restringidos
4. Los usuarios solo ven esto la primera vez

**Para eliminar este warning completamente:**
- Necesitarías pasar por verificación de Google (proceso largo)
- NO es necesario para tu caso (scope restringido)

---

### **Problema: Usuarios agregados como testers siguen viendo error**

**Causa:** Email incorrecto o no es cuenta Google

**Solución:**
1. Verifica que el correo sea el de la **cuenta Google** exacta
2. Si usan Google Workspace (@tudominio.com), usa ese correo
3. Si usan Gmail, usa @gmail.com
4. Remove y vuelve a agregar el correo

---

## 📊 Comparación Final

| Aspecto | Testing | In Production |
|---------|---------|---------------|
| **Usuarios** | Solo test users | ✅ Cualquiera |
| **Límite** | 100 | ✅ Ilimitado |
| **Agregar usuarios** | Manual | ✅ Automático |
| **Tokens expiran** | Cada 7 días | ✅ Más duraderos |
| **Verificación Google** | No requerida | No requerida |
| **Tiempo setup** | Inmediato | 5-10 min |

---

## 🚀 Recomendación Final

**Para Crosslog:**

1. **PUBLICAR LA APP** (Solución 1)
   - Click en "PUBLISH APP"
   - Espera 10 minutos
   - Cualquier empleado puede usar la app

**Ventajas:**
- ✅ Sin límite de usuarios
- ✅ Sin mantenimiento manual
- ✅ Escalable
- ✅ Profesional

**NO es necesario:**
- ❌ Verificación de Google
- ❌ Revisión de seguridad
- ❌ Formularios complejos

**Tu scope es "restringido" así que puedes publicar libremente.** 🎉

---

## 🔗 Enlaces Útiles

- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent
- **Google Cloud Console:** https://console.cloud.google.com
- **Tu Proyecto:** primeval-falcon-461210-g1
- **Documentación Scopes:** https://developers.google.com/identity/protocols/oauth2/scopes

---

**¡Problema identificado y soluciones documentadas!** ✅

**Acción recomendada:** Publicar la app (2 clicks, 10 minutos).
