# 📱 CREDENCIALES WHATSAPP - CROSSLOG (CONSOLIDADO)

**Última actualización:** 2025-01-04

---

## ✅ APP APROBADA POR META (5 Nov 2025)

**ESTADO**: `whatsapp_business_messaging` APROBADO por Meta

**Esto significa**:
- ✅ Puedes enviar mensajes automáticamente sin interacción previa
- ✅ Puedes enviar a cualquier número (no solo números de prueba)
- ✅ Modo producción activado
- ✅ Sin límite de destinatarios
- ✅ Mensajes de texto libre o templates permitidos

**YA NO necesitas**:
- ❌ Que el usuario escriba primero al número de Meta
- ❌ Restringir envíos a números de prueba
- ❌ Conversaciones activas previas

---

## ✅ CREDENCIALES VÁLIDAS (Usar estas en TODOS los lugares)

```
Phone Number ID: 764420436762718
WhatsApp Business Account ID: 1687233251972684
App ID: 1652402132069292
App Secret: 680b61b3bf57046d09b5018edc676a4c

Token Permanente (VÁLIDO y FUNCIONANDO):
EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk
```

---

## 🔧 CÓMO COPIAR CONFIGURACIÓN DEL WORKFLOW QUE FUNCIONA

**PASO A PASO PARA COPIAR CONFIGURACIÓN**:

1. **Abre tu workflow de N8N que está funcionando** (donde WhatsApp envía correctamente)
2. **Haz clic en el nodo HTTP Request de WhatsApp**
3. **Toma nota de CADA detalle**:
   - Method: ¿POST?
   - URL: ¿Cuál es la URL exacta?
   - Authentication: ¿None o Generic Credential Header?
   - Headers: ¿Qué headers tiene? (Authorization, Content-Type, etc.)
   - Body: ¿Cómo está configurado el JSON? ¿Expression o JSON mode?
   - Options: ¿Tiene "Always Output Data" activado?
4. **Exporta el nodo**:
   - Click derecho en el nodo → Download
   - O copia manualmente toda la configuración
5. **En el workflow crosslog-entregas**:
   - Importa el nodo o recrea la configuración exacta
   - Verifica que cada campo coincida 100%
6. **Prueba con una ejecución manual**

## 🔧 CONFIGURACIÓN EN N8N (HTTP Request)

**Configuración recomendada** (verificar con workflow que funciona):

```
Method: POST
URL: https://graph.facebook.com/v18.0/764420436762718/messages

Authentication: None

Headers:
  Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk
  Content-Type: application/json

Body (preparar en Code node previo):
  ={{ $json.whatsappBody }}

Options:
  ☑ Always Output Data (IMPORTANTE)
```

---

## 🧪 PRUEBA RÁPIDA

```bash
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" \
  -H "Authorization: Bearer EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"5491173603954","type":"text","text":{"body":"Test OK"}}'
```

**Respuesta esperada:** `{"messaging_product":"whatsapp","contacts":[...],"messages":[...]}`

---

## 📍 ARCHIVOS ACTUALIZADOS

| Archivo | Token Correcto | Estado |
|---------|---------------|--------|
| `send_whatsapp.sh` | ✅ | Actualizado |
| `N8N-WHATSAPP-NODO-HTTP.md` | ✅ | Actualizado |
| `test-whatsapp-token.md` | ⚠️ | Contiene info genérica |

---

## 🚨 SOLUCIÓN ERROR "Node does not have access to credential"

**Problema:** El nodo "Send message" en N8N no puede acceder a la credencial.

**Solución:**

1. **Settings** → **Credentials** → Edita tu credencial WhatsApp
2. Activa: **"Share with all workflows"** o **"Available to all users"**
3. Guarda la credencial
4. Ve al workflow → Nodo "Send message" → Reselecciona la credencial
5. Guarda el workflow
6. Prueba de nuevo

---

## 📞 NÚMEROS DE PRUEBA AUTORIZADOS

En Meta → WhatsApp → Phone numbers → "To":

- ✅ +5491173603954 (verificado)

Para agregar más números:
1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/
2. Sección "Phone numbers" → "To" → Add phone number
3. Ingresa código de verificación desde WhatsApp

---

## ⚠️ NO USAR (Tokens caducados)

~~EAAXe2dobq6wBPinPbuSZAxO...8DMrrPygZDZD~~ ❌ CADUCADO

---

## 🔗 LINKS ÚTILES

- Meta Developer Console: https://developers.facebook.com/apps/1652402132069292/
- WhatsApp Settings: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-settings/
- Business Settings: https://business.facebook.com/settings/system-users/1687233251972684
- WhatsApp API Setup: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/

---

## 📂 OTROS ARCHIVOS DE REFERENCIA

**Archivos disponibles** (para referencia adicional):

1. **N8N-WHATSAPP-NODO-HTTP.md**
   - Configuración detallada del nodo HTTP Request para N8N
   - Ejemplos de curl para pruebas
   - Troubleshooting de errores comunes

2. **MANUAL-WHATSAPP-META-CONFIGURACION.md**
   - Guía completa para configurar WhatsApp Business API desde cero
   - Útil si necesitas crear una nueva app o regenerar credenciales
   - Paso a paso para System Users y tokens permanentes

3. **META-APP-REVIEW-RESPUESTAS.md**
   - Información para el proceso de revisión de app en Meta
   - Necesario solo si vas a publicar en producción

4. **test-whatsapp-token.md**
   - Guía rápida para generar nuevos tokens
   - Solo usar si el token actual expira

5. **send_whatsapp.sh**
   - Script bash para probar envío de WhatsApp desde línea de comandos
   - Útil para pruebas rápidas sin N8N

**NOTA**: Este archivo (WHATSAPP-CREDENTIALS.md) es la fuente de verdad para credenciales y configuración actual.
