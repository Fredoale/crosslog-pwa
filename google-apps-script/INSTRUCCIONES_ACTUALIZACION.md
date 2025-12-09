# 🔧 INSTRUCCIONES PARA ACTUALIZAR GOOGLE APPS SCRIPT

## ❗ PROBLEMA IDENTIFICADO

El Google Apps Script actual **NO tiene las funciones del Marketplace**, por eso los viajes no se guardan.

El error en los logs es claro:
```
[MarketplaceAPI] Response body: {"success":false,"message":"Acción no reconocida"}
```

## ✅ SOLUCIÓN

Debes copiar el código actualizado de `Code.gs` a tu Google Apps Script.

---

## 📋 PASOS PARA ACTUALIZAR

### 1️⃣ Abrir Google Apps Script

1. Ve a tu Google Spreadsheet: `Sistema_Entregas`
2. Haz clic en **Extensiones** → **Apps Script**
3. Se abrirá el editor de Google Apps Script

### 2️⃣ Reemplazar el código

1. En el editor, verás un archivo llamado `Code.gs`
2. **Selecciona TODO el código existente** y bórralo
3. **Copia el contenido completo** del archivo `google-apps-script/Code.gs` de este proyecto
4. **Pégalo** en el editor de Google Apps Script

### 3️⃣ Guardar y desplegar

1. Haz clic en el icono de **💾 Guardar** (o Ctrl+S)
2. Haz clic en **Implementar** → **Nueva implementación**
3. Selecciona:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: Cualquier persona
4. Haz clic en **Implementar**
5. **Copia la URL** que te da (debe ser similar a la que ya tienes en `.env`)

### 4️⃣ Verificar la URL en .env

Asegúrate de que la URL en tu archivo `.env` sea correcta:

```env
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec
```

---

## 🎯 QUÉ HACE EL CÓDIGO ACTUALIZADO

El código actualizado agrega 4 nuevas acciones para el Marketplace:

### ✅ `CREATE_MARKETPLACE_VIAJE`
- Crea un nuevo viaje en la hoja `Marketplace_Viajes`
- Guarda todos los datos del viaje (cliente, fecha, ruta, etc.)

### ✅ `UPDATE_MARKETPLACE_VIAJE`
- Actualiza un viaje existente
- Se usa para cambiar estado (BORRADOR → PUBLICADO → ASIGNADO)

### ✅ `UPDATE_MARKETPLACE_OFERTA`
- Actualiza ofertas de fleteros
- Se usa para aceptar/rechazar ofertas

### ✅ `DELETE_MARKETPLACE_VIAJE`
- Elimina un viaje del marketplace
- Busca por HDR y elimina la fila completa

---

## 🧪 CÓMO PROBAR QUE FUNCIONA

Después de actualizar el código:

1. **Recarga la aplicación** (F5 en el navegador)
2. **Crea un viaje de prueba** en el Marketplace
3. **Revisa los logs** en la consola del navegador (F12)
   - Deberías ver: `{"success":true,"message":"Viaje creado exitosamente en marketplace"}`
4. **Verifica en Google Sheets**
   - Abre la hoja `Marketplace_Viajes`
   - El nuevo viaje debería aparecer en la última fila

---

## ❓ SOLUCIÓN DE PROBLEMAS

### "Acción no reconocida"
→ El código en Google Apps Script no está actualizado. Repite los pasos 1-3.

### "Hoja Marketplace_Viajes no encontrada"
→ Verifica que tu spreadsheet tenga una hoja llamada exactamente `Marketplace_Viajes` (respeta mayúsculas).

### URL incorrecta
→ Asegúrate de que `VITE_GOOGLE_APPS_SCRIPT_URL` en `.env` termine en `/exec` y sea la URL de la implementación actual.

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **NO cambies el nombre de las hojas** en Google Sheets (deben ser exactamente: `Marketplace_Viajes`, `Marketplace_Ofertas`)
- 💡 Después de cada cambio en Google Apps Script, debes crear una **nueva implementación** o actualizar la existente
- 🔄 Si cambias la implementación, actualiza la URL en `.env`

---

## ✅ CHECKLIST

- [ ] Abrí Google Apps Script desde mi spreadsheet
- [ ] Reemplacé todo el código con el nuevo `Code.gs`
- [ ] Guardé el código (💾)
- [ ] Creé/actualicé la implementación como Web App
- [ ] Copié la URL y la verifiqué en `.env`
- [ ] Probé crear un viaje y funcionó ✨
