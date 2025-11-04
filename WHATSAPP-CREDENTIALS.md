# 📱 CREDENCIALES WHATSAPP - CROSSLOG (CONSOLIDADO)

**Última actualización:** 2025-01-04

---

## ✅ CREDENCIALES VÁLIDAS (Usar estas en TODOS los lugares)

```
Phone Number ID: 764420436762718
WhatsApp Business Account ID: 1687233251972684
App ID: 1652402132069292
App Secret: 680b61b3bf57046d09b5018edc676a4c

Token Permanente (VÁLIDO):
EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk
```

---

## 🔧 CONFIGURACIÓN EN N8N

### Opción A: Usar Credencial Compartida (Recomendado)

1. Ve a: **Settings** → **Credentials**
2. Busca tu credencial de WhatsApp existente
3. Edítala y marca: **"Share with all workflows"**
4. En el nodo "Send message", selecciona esa credencial compartida

### Opción B: Crear Nueva Credencial

1. En el nodo WhatsApp → **Create New Credential**
2. Nombre: `WhatsApp Crosslog`
3. Access Token: (pega el token de arriba)
4. Guarda

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
