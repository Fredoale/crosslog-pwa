# 📱 CONFIGURACIÓN NODO WHATSAPP EN N8N

## ✅ APP APROBADA - LISTA PARA PRODUCCIÓN

**ESTADO**: `whatsapp_business_messaging` APROBADO por Meta (5 Nov 2025)

**Configuración lista para usar**:
- ✅ Token válido y funcionando
- ✅ Permiso de producción activado
- ✅ Sin restricciones de números de destino
- ✅ Envío automático sin interacción previa

**Ya puedes enviar mensajes a**:
- Cualquier número de WhatsApp
- Sin necesidad de conversación activa previa
- Automáticamente al completar entregas

---

## ✅ TUS CREDENCIALES (Actualizadas y FUNCIONANDO)

```
Phone Number ID: 764420436762718
WhatsApp Business Account ID: 1687233251972684
App ID: 1652402132069292
App Secret: 680b61b3bf57046d09b5018edc676a4c
Token Permanente (VÁLIDO): EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk
```

---

## 🔧 PASO 1A: Crear Nodo Code (Preparar Body WhatsApp)

**IMPORTANTE**: Para evitar errores de JSON con emojis y caracteres especiales, primero prepara el body en un nodo Code.

En N8N, después del **Nodo 2** (HDR Completado):

### Agregar nodo: **Code**

**Configuración:**

```javascript
// Preparar body de WhatsApp (evita problemas con JSON y emojis)
const inputData = $input.item.json;

const whatsappBody = {
  messaging_product: "whatsapp",
  to: inputData.whatsapp.numero,
  type: "text",
  text: {
    body: inputData.whatsapp.mensaje
  }
};

return { whatsappBody };
```

---

## 🔧 PASO 1B: Crear Nodo HTTP Request (WhatsApp HDR Completado)

Después del nodo Code:

### Agregar nodo: **HTTP Request**

**Configuración:**

```
Method: POST
URL: https://graph.facebook.com/v18.0/764420436762718/messages

Authentication: None (usaremos el token en Headers)

Headers:
  Content-Type: application/json
  Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk

Body (Expression mode):
  ={{ $json.whatsappBody }}

Options:
  ☑ Always Output Data
```

---

## 🔧 PASO 2: Repetir para Entrega Individual

En N8N, después del **Nodo 3** (Entrega Individual):

1. **Agrega nodo Code** (igual que el anterior)
2. **Agrega nodo HTTP Request** (igual que el anterior)

⚠️ **NOTA:** Usa la MISMA configuración en ambos flujos (HDR Completado y Entrega Individual)

---

## 🧪 PRUEBA MANUAL (COMANDO CURL)

Ejecuta este comando para probar tu token permanente:

```bash
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" \
  -H "Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk" \
  -H "Content-Type: application/json" \
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"5491173603954\",\"type\":\"text\",\"text\":{\"body\":\"🧪 Prueba WhatsApp - CROSSLOG OK\"}}"
```

**Versión Windows (cmd):**
```cmd
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" -H "Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk" -H "Content-Type: application/json" -d "{\"messaging_product\":\"whatsapp\",\"to\":\"5491173603954\",\"type\":\"text\",\"text\":{\"body\":\"Test OK\"}}"
```

### ✅ Respuesta Esperada:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5491173603954",
      "wa_id": "5491173603954"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNNTQ5MTE3MzYwMzk1NBUCABIYFjNFQjBCMDREMjNGQUM0NUEyOUYyNjcA"
    }
  ]
}
```

---

## ❌ ERRORES COMUNES

### 1. "Invalid OAuth access token"
**Causa**: Token expirado o incorrecto
**Solución**:
1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-settings/
2. En "System Users" → Genera un nuevo token con permisos `whatsapp_business_messaging`
3. Actualiza el token en los nodos de N8N

### 2. "Phone number not found" o "Invalid Phone Number ID"
**Causa**: Phone Number ID incorrecto
**Solución**: Verifica el ID en la consola de Meta (usamos: 764420436762718)

### 3. "Message not delivered" o "Recipient not registered"
**Causa**: El número +5491173603954 no está verificado como número de prueba
**Solución**:
1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-settings/
2. Sección "Numbers" → "To" → Agrega +5491173603954 como número de prueba
3. Verifica el código que llegue a ese número

### 4. "Rate limit exceeded"
**Causa**: Demasiados mensajes en poco tiempo
**Solución**: Espera 1 minuto y vuelve a intentar

---

## 📸 CAPTURAS DE PANTALLA (Ubicaciones en Meta)

### Para obtener el Token Permanente:

1. Ve a: https://developers.facebook.com/apps/1652402132069292/settings/basic/
2. Copia "App ID" y "App Secret"
3. Luego ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-settings/
4. En "System Users" → Create System User → Genera token con permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copia el token y guárdalo (NO expira)

### Para verificar el Phone Number ID:

1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/
2. En la sección "Phone numbers" verás: `764420436762718`
3. Este es el ID que usas en la URL del API

---

## 📝 CHECKLIST FINAL

- [ ] Token permanente obtenido desde Meta
- [ ] Token agregado en Headers de ambos nodos HTTP
- [ ] Phone Number ID verificado (764420436762718)
- [ ] Número +5491173603954 agregado como número de prueba en Meta
- [ ] Código de verificación ingresado desde el celular
- [ ] Prueba con CURL exitosa
- [ ] Nodos HTTP agregados en N8N después de Nodo 2 y Nodo 3
- [ ] Flujo N8N guardado y activado

---

## 🎯 FLUJO COMPLETO N8N (con WhatsApp)

```
Webhook
  ↓
Nodo 1 (Procesar)
  ↓
Google Sheets (Escribir Sistema_entregas)
  ↓
IF (¿HDR Completado?)
  ├─ TRUE → Google Sheets Lookup (Sistema_entregas)
  │           ↓
  │         Nodo 2 (Generar Email HDR Completado)
  │           ↓
  │         Gmail (Enviar Email HDR Completado)
  │           ↓
  │         Code (Preparar WhatsApp Body) ✨ NUEVO
  │           ↓
  │         HTTP Request (WhatsApp HDR Completado) ✨ NUEVO
  │           [Options: ☑ Always Output Data]
  │
  └─ FALSE → Nodo 3 (Generar Email Entrega Individual)
                ↓
              Gmail (Enviar Email Entrega Individual)
                ↓
              Code (Preparar WhatsApp Body) ✨ NUEVO
                ↓
              HTTP Request (WhatsApp Entrega Individual) ✨ NUEVO
                [Options: ☑ Always Output Data]
```

**IMPORTANTE**: El flujo debe continuar incluso si WhatsApp falla. La opción "Always Output Data" garantiza esto.

---

## 🆘 SOPORTE

Si tienes problemas:

1. **Revisa los logs del nodo HTTP en N8N**:
   - Haz clic en el nodo WhatsApp
   - Ve a "Executions" → Última ejecución
   - Lee el error detallado

2. **Prueba con CURL** para descartar problemas de N8N

3. **Revisa el Activity Log en Meta**:
   - https://developers.facebook.com/apps/1652402132069292/dashboard/

---

## 💡 NOTA IMPORTANTE

✅ **TOKEN PERMANENTE CONFIGURADO Y FUNCIONANDO**

El token permanente está activo y funcionando en otro workflow de N8N. Este token NO expira a menos que lo regeneres manualmente en Meta.

**Importante**:
- Guarda este token de forma segura
- NO lo compartas públicamente
- Si tienes problemas de autorización, copia la configuración del workflow que funciona
- NO regeneres el token - ya está validado y funcionando

---

## 📂 ARCHIVOS CONSOLIDADOS

**Para credenciales actualizadas**: Ver `WHATSAPP-CREDENTIALS.md` (fuente de verdad)

**Otros archivos de referencia**:
- `MANUAL-WHATSAPP-META-CONFIGURACION.md` - Setup completo desde cero
- `META-APP-REVIEW-RESPUESTAS.md` - Publicación a producción
- `test-whatsapp-token.md` - Regenerar tokens (solo si es necesario)
- `send_whatsapp.sh` - Pruebas desde línea de comandos
