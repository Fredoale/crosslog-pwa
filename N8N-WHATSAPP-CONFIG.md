# Configuración de WhatsApp Business Cloud API en N8N

## 📋 Datos Necesarios

- **App ID**: 1652402132069292
- **Token Permanente**: `EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD`
- **Tu Número**: +5491173603954
- **Phone Number ID**: ❓ **FALTA OBTENER** (ve a https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/)

---

## 🔧 Configuración en N8N

### Paso 1: Agregar Nodo HTTP Request (para WhatsApp)

En tu flujo N8N:

1. **Después del Nodo 2** (HDR Completado):
   - Agrega un nodo **HTTP Request**
   - Configúralo así:

```
Authentication: None (usar token en header)
Method: POST
URL: https://graph.facebook.com/v18.0/[PHONE_NUMBER_ID]/messages

Headers:
- Authorization: Bearer EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD
- Content-Type: application/json

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

**IMPORTANTE**: Reemplaza `[PHONE_NUMBER_ID]` con el ID que obtengas de Meta.

2. **Después del Nodo 3** (Entrega Individual):
   - Repite el mismo nodo HTTP Request con la misma configuración

---

## 🧪 Prueba Manual

Para probar si tu configuración de WhatsApp funciona, ejecuta este comando en tu terminal:

```bash
curl -X POST "https://graph.facebook.com/v18.0/[PHONE_NUMBER_ID]/messages" \
  -H "Authorization: Bearer EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD" \
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

Si devuelve algo como:
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{"input": "5491173603954", "wa_id": "5491173603954"}],
  "messages": [{"id": "wamid.xxx"}]
}
```

✅ **Significa que funciona!**

---

## ❌ Errores Comunes

### Error: "Invalid OAuth access token"
- **Causa**: Token expirado o incorrecto
- **Solución**: Genera un nuevo token permanente en Meta

### Error: "Phone number not found"
- **Causa**: Phone Number ID incorrecto
- **Solución**: Verifica el ID en la consola de Meta

### Error: "Message not delivered"
- **Causa**: El número destino no está verificado
- **Solución**: Agrega el número +5491173603954 como número de prueba en Meta

---

## 📸 Capturas de Pantalla (ubicaciones en Meta)

1. **Phone Number ID**:
   - Meta for Developers → Apps → Tu App (1652402132069292) → WhatsApp → API Setup
   - Busca la sección "Phone numbers" y copia el ID

2. **Verificar Token**:
   - Meta for Developers → Apps → Tu App → WhatsApp → Configuration
   - "Temporary access token" o "System User Token"

---

## 🔍 Debug en N8N

Para ver qué está pasando:

1. En N8N, haz clic en el nodo HTTP Request de WhatsApp
2. Ve a "Executions"
3. Busca la última ejecución
4. Verás:
   - ✅ Verde: Mensaje enviado correctamente
   - ❌ Rojo: Error (lee el mensaje de error)

---

## 📝 Notas Importantes

- El token que te di es permanente, **NO expira** (a menos que lo regeneres en Meta)
- Asegúrate de que el número +5491173603954 esté verificado en WhatsApp Business
- Los mensajes solo se pueden enviar a números que tengan una conversación activa O números de prueba registrados en Meta
- WhatsApp Business Cloud API tiene límites de mensajes por día según tu tier
