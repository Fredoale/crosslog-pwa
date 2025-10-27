# 📱 CONFIGURACIÓN NODO WHATSAPP EN N8N

## ✅ TUS CREDENCIALES

```
Phone Number ID: 764420436762718
WhatsApp Business Account ID: 1687233251972684
App ID: 1652402132069292
App Secret: 680b61b3bf57046d09b5018edc676a4c
Token Permanente: EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD
```

---

## 🔧 PASO 1: Crear Nodo HTTP Request (WhatsApp HDR Completado)

En N8N, después del **Nodo 2** (HDR Completado):

### Agregar nodo: **HTTP Request**

**Configuración:**

```
Method: POST
URL: https://graph.facebook.com/v18.0/764420436762718/messages

Authentication: None (usaremos el token en Headers)

Headers:
  Content-Type: application/json
  Authorization: Bearer EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD

Body (JSON):
{
  "messaging_product": "whatsapp",
  "to": "5491173603954",
  "type": "text",
  "text": {
    "body": "{{ $json.whatsapp.mensaje }}"
  }
}
```

---

## 🔧 PASO 2: Crear Nodo HTTP Request (WhatsApp Entrega Individual)

En N8N, después del **Nodo 3** (Entrega Individual):

### Agregar nodo: **HTTP Request**

**Configuración:**

```
Method: POST
URL: https://graph.facebook.com/v18.0/764420436762718/messages

Authentication: None (usaremos el token en Headers)

Headers:
  Content-Type: application/json
  Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk

Body (JSON):
{
  "messaging_product": "whatsapp",
  "to": "5491173603954",
  "type": "text",
  "text": {
    "body": "{{ $json.whatsapp.mensaje }}"
  }
}
```

---

## 🧪 PRUEBA MANUAL (COMANDO CURL)

Ejecuta este comando para probar tu configuración:

```bash
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" \
  -H "Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5491173603954",
    "type": "text",
    "text": {
      "body": "🧪 Prueba de WhatsApp desde N8N - CROSSLOG"
    }
  }'
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
  │         HTTP Request (WhatsApp HDR Completado) ✨ NUEVO
  │
  └─ FALSE → Nodo 3 (Generar Email Entrega Individual)
                ↓
              Gmail (Enviar Email Entrega Individual)
                ↓
              HTTP Request (WhatsApp Entrega Individual) ✨ NUEVO
```

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

✅ **TOKEN PERMANENTE CONFIGURADO**

El token permanente está activo y listo para usar. Este token NO expira a menos que lo regeneres manualmente en Meta.

**Importante**:
- Guarda este token de forma segura
- NO lo compartas públicamente
- Si necesitas regenerarlo, deberás actualizar todos los nodos HTTP en N8N
