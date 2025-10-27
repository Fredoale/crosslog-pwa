# 📱 MANUAL COMPLETO: Configuración de WhatsApp Business API con Meta

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Crear App en Meta for Developers](#paso-1-crear-app-en-meta-for-developers)
3. [Configurar WhatsApp Business](#paso-2-configurar-whatsapp-business)
4. [Crear Usuario del Sistema (System User)](#paso-3-crear-usuario-del-sistema)
5. [Generar Token Permanente](#paso-4-generar-token-permanente)
6. [Configurar Números de Teléfono](#paso-5-configurar-números-de-teléfono)
7. [Integrar con N8N](#paso-6-integrar-con-n8n)
8. [Pruebas y Verificación](#paso-7-pruebas-y-verificación)
9. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

✅ **Lo que necesitas antes de empezar:**

- Una cuenta de Facebook con privilegios de administrador
- Acceso a Meta for Developers (https://developers.facebook.com)
- Una cuenta de WhatsApp Business Manager
- Un número de teléfono para WhatsApp Business (no puede estar registrado en WhatsApp personal)
- Acceso a N8N (para la integración)

---

## PASO 1: Crear App en Meta for Developers

### 1.1 Acceder a Meta for Developers

1. Ve a: https://developers.facebook.com
2. Inicia sesión con tu cuenta de Facebook
3. Haz clic en **"My Apps"** (Mis Apps) en la esquina superior derecha

### 1.2 Crear Nueva App

1. Haz clic en **"Create App"** (Crear App)
2. Selecciona el tipo de app: **"Business"** (Negocios)
3. Completa la información:
   - **Display Name**: CROSSLOG WhatsApp (o el nombre que prefieras)
   - **Contact Email**: tu email de contacto
   - **Business Account**: Selecciona o crea una cuenta de negocios
4. Haz clic en **"Create App"** (Crear App)

### 1.3 Configurar App Básica

1. Una vez creada la app, verás el **Dashboard**
2. Ve a **"Settings" → "Basic"** (Configuración → Básica)
3. Aquí encontrarás:
   - **App ID**: Anótalo (ej: `1652402132069292`)
   - **App Secret**: Haz clic en "Show" y anótalo (ej: `680b61b3bf57046d09b5018edc676a4c`)

📝 **Guarda estos datos en un lugar seguro**

---

## PASO 2: Configurar WhatsApp Business

### 2.1 Agregar Producto WhatsApp

1. En el Dashboard de tu App, busca **"Add Product"** (Agregar Producto)
2. Encuentra **"WhatsApp"** y haz clic en **"Set Up"** (Configurar)

### 2.2 Crear WhatsApp Business Account

1. Te pedirá crear o seleccionar una **WhatsApp Business Account**
2. Si no tienes una:
   - Haz clic en **"Create New WhatsApp Business Account"**
   - Nombre: `CROSSLOG WhatsApp Business`
   - Acepta los términos y condiciones
3. Haz clic en **"Continue"**

### 2.3 Obtener Phone Number ID

1. Ve a **"WhatsApp" → "API Setup"** en el menú lateral
2. En la sección **"Phone numbers"** verás:
   - **Phone Number**: El número de WhatsApp (ej: `+54 9 11 7360-3954`)
   - **Phone Number ID**: Anótalo (ej: `764420436762718`)
3. También verás el **WhatsApp Business Account ID**: Anótalo (ej: `1687233251972684`)

📝 **Guarda estos IDs**

---

## PASO 3: Crear Usuario del Sistema

### 3.1 Acceder a Business Settings

1. Ve a **"Business Settings"** desde el menú de tu App
2. O accede directamente a: https://business.facebook.com/settings

### 3.2 Crear System User

1. En el menú lateral, busca **"Users" → "System Users"** (Usuarios → Usuarios del Sistema)
2. Haz clic en **"Add"** (Agregar)
3. Completa la información:
   - **System User Name**: `AdminToken` (o el nombre que prefieras)
   - **System User Role**: Selecciona **"Admin"** (Administrador)
4. Haz clic en **"Create System User"**

### 3.3 Asignar Activos al System User

1. Selecciona el System User que acabas de crear (`AdminToken`)
2. Haz clic en **"Add Assets"** (Agregar Activos)
3. Selecciona:
   - **Apps**: Marca tu app de CROSSLOG
   - **WhatsApp Accounts**: Marca tu WhatsApp Business Account
   - Asigna **"Full Control"** (Control Total) a cada uno
4. Haz clic en **"Save Changes"**

📝 **El System User ahora tiene acceso a tu app y WhatsApp Business**

---

## PASO 4: Generar Token Permanente

### 4.1 Generar Token desde System User

1. En la lista de **System Users**, selecciona `AdminToken`
2. Haz clic en **"Generate New Token"** (Generar Nuevo Token)
3. Selecciona tu **App** (CROSSLOG WhatsApp)
4. Selecciona los **permisos** (Permissions):
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
5. Selecciona la duración: **"Never Expire"** (Nunca Expira)
6. Haz clic en **"Generate Token"**

### 4.2 Copiar y Guardar Token

1. Se mostrará un token largo (ej: `EAAXe2dobq6wBPinPbuSZAxO...`)
2. **¡IMPORTANTE!** Copia este token INMEDIATAMENTE
3. Guárdalo en un lugar seguro (password manager, archivo encriptado, etc.)
4. **NO podrás volver a verlo** después de cerrar este diálogo

⚠️ **Este token es PERMANENTE y NO expira** (a menos que lo regeneres manualmente)

📝 **Ejemplo de Token:**
```
EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD
```

---

## PASO 5: Configurar Números de Teléfono

### 5.1 Agregar Número de Destino (Para Testing)

Durante la fase de desarrollo, solo puedes enviar mensajes a números verificados.

1. Ve a **"WhatsApp" → "API Setup"**
2. En la sección **"To"**, haz clic en **"Add phone number"**
3. Ingresa el número de destino: `+5491173603954`
4. Haz clic en **"Send Code"**
5. Ingresa el código que recibiste en WhatsApp
6. Haz clic en **"Verify"**

✅ **Ahora puedes enviar mensajes a este número**

### 5.2 Verificar Número de Envío (From)

1. En la misma página, verás el número **"From"**
2. Este es el número desde donde se enviarán los mensajes
3. Verifica que esté correctamente configurado

---

## PASO 6: Integrar con N8N

### 6.1 Configurar Nodo HTTP Request en N8N

1. Abre tu flujo de N8N
2. Después del **Nodo 2** (HDR Completado), agrega un nodo **HTTP Request**

**Configuración del Nodo:**

```
Node Name: WhatsApp HDR Completado
Method: POST
URL: https://graph.facebook.com/v18.0/764420436762718/messages

Authentication: None

Headers (Add 2 headers):
  1. Content-Type: application/json
  2. Authorization: Bearer EAAXe2dobq6wBPinPbuSZAxO... (tu token completo)

Body Content Type: JSON

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

### 6.2 Repetir para Entrega Individual

1. Después del **Nodo 3** (Entrega Individual), agrega otro nodo **HTTP Request**
2. Usa la misma configuración que arriba

### 6.3 Guardar y Activar Flujo

1. Guarda tu flujo en N8N
2. Actívalo (toggle "Active" en ON)

---

## PASO 7: Pruebas y Verificación

### 7.1 Prueba Manual con CURL

Antes de probar en N8N, verifica que tu token funcione con CURL:

```bash
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" \
  -H "Authorization: Bearer EAAXe2dobq6wBPinPbuSZAxOdImAmpiJm658adkdizRVZAO7RksF8woGSl0yOZCXZCtIDbZBTiRlrQ5z3xA2Sx2VyYFYxNYZCRQOwtGXKdRZAZB2CYbZA517yKSOGTNBdjp8IxDJwobfhBpz1TOeJroU2ABWh13nTN2Vri4AqMwlkV8nhSvl161a1Aq7thQh8DMrrPygZDZD" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5491173603954",
    "type": "text",
    "text": {
      "body": "🧪 Prueba desde CURL - CROSSLOG"
    }
  }'
```

**✅ Respuesta Esperada:**
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

### 7.2 Prueba en N8N

1. En N8N, ejecuta manualmente tu flujo (clic en "Execute Workflow")
2. Verifica que el nodo HTTP Request de WhatsApp se ejecute exitosamente
3. Deberías recibir un mensaje en WhatsApp en el número +5491173603954

### 7.3 Verificar Logs

1. En Meta for Developers, ve a **"WhatsApp" → "Activity Log"**
2. Verás todos los mensajes enviados
3. Si hay errores, aparecerán aquí con detalles

---

## Troubleshooting

### ❌ Error: "Invalid OAuth access token"

**Causa**: Token expirado, incorrecto o sin permisos adecuados

**Solución**:
1. Ve a Business Settings → System Users
2. Genera un nuevo token con los mismos permisos
3. Actualiza el token en N8N

### ❌ Error: "Phone number not found" o "Invalid Phone Number ID"

**Causa**: Phone Number ID incorrecto en la URL

**Solución**:
1. Ve a WhatsApp → API Setup
2. Copia el **Phone Number ID** correcto
3. Actualiza la URL en N8N: `https://graph.facebook.com/v18.0/[PHONE_NUMBER_ID]/messages`

### ❌ Error: "Recipient phone number not in allowed list"

**Causa**: El número de destino no está verificado como número de prueba

**Solución**:
1. Ve a WhatsApp → API Setup
2. En la sección "To", agrega el número +5491173603954
3. Verifica el código que llegue al celular

### ❌ Error: "Message not delivered"

**Posibles Causas**:
- El número no tiene WhatsApp instalado
- El número bloqueó tu WhatsApp Business
- Restricciones de Meta

**Solución**:
1. Verifica que el número tenga WhatsApp activo
2. Revisa el Activity Log en Meta para más detalles
3. Asegúrate de que el número esté en formato internacional: `5491173603954` (sin +)

### ❌ Error: "Rate limit exceeded"

**Causa**: Demasiados mensajes en poco tiempo

**Solución**:
- Espera 1-2 minutos antes de volver a intentar
- Meta limita la cantidad de mensajes según tu tier
- Para producción, solicita un tier superior en Meta

### ❌ Error: "App not approved for production"

**Causa**: Tu app está en modo desarrollo

**Solución**:
- En desarrollo, solo puedes enviar a números verificados (limitado)
- Para producción:
  1. Ve a WhatsApp → Getting Started
  2. Completa el proceso de "App Review"
  3. Solicita aprobación para `whatsapp_business_messaging`
  4. Una vez aprobado, podrás enviar a cualquier número

---

## 📝 Resumen de Credenciales

Al finalizar la configuración, deberías tener:

```
✅ App ID: 1652402132069292
✅ App Secret: 680b61b3bf57046d09b5018edc676a4c
✅ Phone Number ID: 764420436762718
✅ WhatsApp Business Account ID: 1687233251972684
✅ Token Permanente: EAAXe2dobq6wBPinPbuSZAxO... (tu token completo)
✅ System User: AdminToken (ID: 61573439145008)
```

---

## 🎯 Checklist Final

Antes de dar por finalizada la configuración, verifica:

- [x] App creada en Meta for Developers
- [x] WhatsApp Business configurado
- [x] System User creado con permisos de Admin
- [x] Token permanente generado y guardado
- [x] Phone Number ID obtenido
- [x] Número de destino +5491173603954 verificado
- [x] Prueba con CURL exitosa
- [x] Nodos HTTP configurados en N8N
- [x] Flujo N8N guardado y activado
- [x] Mensaje de prueba recibido en WhatsApp

---

## 📚 Enlaces Útiles

- **Meta for Developers Dashboard**: https://developers.facebook.com/apps/1652402132069292/dashboard/
- **WhatsApp API Setup**: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-settings/
- **Business Settings**: https://business.facebook.com/settings
- **WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Activity Log**: https://developers.facebook.com/apps/1652402132069292/dashboard/

---

## 🔐 Seguridad y Mejores Prácticas

1. **NUNCA compartas tu token públicamente** (GitHub, Slack, emails, etc.)
2. **Usa variables de entorno** en N8N para el token (no lo hardcodees)
3. **Regenera el token** si sospechas que fue comprometido
4. **Revisa el Activity Log** regularmente para detectar uso no autorizado
5. **Mantén actualizado** tu Business Manager con usuarios autorizados
6. **Limita los permisos** del System User a solo lo necesario
7. **Habilita autenticación de dos factores** en tu cuenta de Facebook

---

## 📞 Contacto y Soporte

**Meta Support**:
- WhatsApp Business API Support: https://business.facebook.com/help
- Developer Community: https://developers.facebook.com/community

**Documentación Oficial**:
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- System Users: https://www.facebook.com/business/help/503306463479099

---

**Creado para**: CROSSLOG - Sistema de Entregas
**Última actualización**: 2025
**Versión**: 1.0
