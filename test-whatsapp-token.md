# 🔑 Generar Nuevo Token de WhatsApp - Guía Rápida

## ⚡ OPCIÓN RÁPIDA: Token Temporal (24 horas)

1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/
2. Busca la sección **"Temporary access token"**
3. Click en el botón para copiar el token
4. Pruébalo con el comando curl de abajo

## 🔒 OPCIÓN PERMANENTE: System User Token (NO expira)

### Paso 1: Ir a Business Settings
https://business.facebook.com/settings/system-users/1687233251972684

### Paso 2: Crear System User (si no existe)
- Click **"Add"**
- Nombre: `CrosslogToken`
- Role: **Admin**
- Click **"Create System User"**

### Paso 3: Asignar Activos
- Selecciona el System User que creaste
- Click **"Add Assets"**
- Selecciona:
  - ✅ **Apps**: CROSSLOG WhatsApp (1652402132069292)
  - ✅ **WhatsApp Accounts**: Tu cuenta (1687233251972684)
- Permisos: **Full Control** para ambos
- **Save Changes**

### Paso 4: Generar Token
- En la lista de System Users, selecciona `CrosslogToken`
- Click **"Generate New Token"**
- Selecciona App: **CROSSLOG WhatsApp**
- Selecciona permisos:
  - ✅ `whatsapp_business_messaging`
  - ✅ `whatsapp_business_management`
- Duración: **60 días** o **Never Expire** (si está disponible)
- Click **"Generate Token"**
- **¡COPIA EL TOKEN INMEDIATAMENTE!** No podrás verlo de nuevo

---

## 🧪 PROBAR EL NUEVO TOKEN

### Usando curl (Windows):

```bash
curl -X POST "https://graph.facebook.com/v18.0/764420436762718/messages" ^
  -H "Authorization: Bearer TU_NUEVO_TOKEN_AQUI" ^
  -H "Content-Type: application/json" ^
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"5491173603954\",\"type\":\"text\",\"text\":{\"body\":\"Test desde curl - Token nuevo funcionando!\"}}"
```

### Respuesta esperada si funciona:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{"input": "5491173603954", "wa_id": "5491173603954"}],
  "messages": [{"id": "wamid.xxxxx"}]
}
```

---

## ❌ ERROR COMÚN: "(#131030) Recipient phone number not in allowed list"

**Causa**: Tu app está en modo desarrollo y el número no está registrado.

**Solución**:

1. Ve a: https://developers.facebook.com/apps/1652402132069292/whatsapp-business/wa-dev-console/
2. Scroll hasta **"Phone numbers"** → Sección **"To"**
3. Click **"Add phone number"**
4. Ingresa: `5491173603954`
5. Recibirás un código en WhatsApp
6. Ingresa el código para verificar
7. Ahora puedes enviar mensajes a ese número

---

## 📋 CHECKLIST

- [ ] Nuevo token generado
- [ ] Token probado con curl
- [ ] Número 5491173603954 agregado como "To" en Meta
- [ ] Código de verificación ingresado
- [ ] Token actualizado en N8N (ambos nodos HTTP)
- [ ] Token actualizado en send_whatsapp.sh
- [ ] Flujo N8N probado end-to-end

---

## 📝 GUARDAR EL NUEVO TOKEN

Una vez que generes el token, actualiza estos archivos:

1. **send_whatsapp.sh** (línea 4 y 12)
2. **N8N** → Nodos HTTP Request (Header Authorization)
3. **Documentación** (para referencia)

**⚠️ IMPORTANTE**: Guarda el token en un lugar seguro (password manager, variables de entorno, etc.)
