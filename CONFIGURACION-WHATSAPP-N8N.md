# 📱 CONFIGURACIÓN WHATSAPP - CROSSLOG PWA

## 🎯 Objetivo

Hacer que N8N envíe WhatsApp **SIN necesidad de que el usuario escriba primero**, igual que funciona en el proyecto de Alertas.

---

## ❌ Problema Actual

El código JavaScript ya prepara los datos de WhatsApp:
```javascript
whatsapp: {
  numero: '5491154096639',
  mensaje: `*HDR ${hdr} - COMPLETADO* ✅ ...`
}
```

**PERO** el nodo de WhatsApp en N8N probablemente está configurado para:
- ❌ Esperar mensaje del usuario (Trigger)
- ❌ O está usando un nodo diferente

---

## ✅ Solución: Configurar Nodo WhatsApp Correctamente

### **Paso 1: Agregar Nodo WhatsApp**

Después de los nodos que generan el email (Nodo 2 y Nodo 3), agrega un nodo de WhatsApp.

---

### **Paso 2: Configuración del Nodo**

#### **Para HDR Completado (después del Nodo 2):**

```yaml
Node Name: Enviar WhatsApp - HDR Completado
Node Type: WhatsApp
Resource: message
Operation: send

Phone Number ID: 764420436762718
Recipient Phone Number: ={{ $json.whatsapp.numero }}
Message Type: text
Message: ={{ $json.whatsapp.mensaje }}
```

#### **Para Entrega Individual (después del Nodo 3):**

```yaml
Node Name: Enviar WhatsApp - Entrega Individual
Node Type: WhatsApp
Resource: message
Operation: send

Phone Number ID: 764420436762718
Recipient Phone Number: ={{ $json.whatsapp.numero }}
Message Type: text
Message: ={{ $json.whatsapp.mensaje }}
```

---

## 🔑 Detalles Importantes

### **1. Phone Number ID**

```
764420436762718
```

Este es el ID de tu número de WhatsApp Business verificado. Es el **mismo** que usas en el proyecto de Alertas.

---

### **2. Recipient Phone Number (Dinámico)**

```javascript
={{ $json.whatsapp.numero }}
```

**¿Por qué funciona?**

Los nodos JavaScript (Nodo 2 y Nodo 3) ya retornan:
```javascript
whatsapp: {
  numero: '5491154096639',
  mensaje: '...'
}
```

La expresión `={{ $json.whatsapp.numero }}` lee ese valor dinámicamente.

**Beneficio:**
- ✅ Puedes cambiar el número en el código JavaScript
- ✅ No necesitas modificar el nodo de WhatsApp

---

### **3. Message (Contenido Dinámico)**

```javascript
={{ $json.whatsapp.mensaje }}
```

Lee el mensaje que ya viene preparado desde el nodo anterior.

---

## 🔧 Paso a Paso en N8N

### **1. Abre tu workflow de Crosslog-PWA en N8N**

### **2. Localiza el nodo "Gmail" para HDR Completado**

Debería estar después del Nodo 2 (Generar Email para HDR Completado).

### **3. Agrega un nodo WhatsApp en paralelo**

```
Nodo 2 (Function) → Gmail ✅
                  ↘ WhatsApp (NUEVO)
```

### **4. Configura el nodo WhatsApp:**

Click en el nodo WhatsApp y configura:

**Parameters:**
- **Resource:** `message`
- **Operation:** `send`
- **Phone Number ID:** `764420436762718`
- **Recipient Phone Number:** Activa modo expresión (`fx`) y pon:
  ```
  {{ $json.whatsapp.numero }}
  ```
- **Message Type:** `text`
- **Message:** Activa modo expresión (`fx`) y pon:
  ```
  {{ $json.whatsapp.mensaje }}
  ```

### **5. Configura Credenciales**

Si aún no tienes las credenciales de WhatsApp configuradas:

1. Click en "Credential to connect with"
2. Selecciona "WhatsApp Business Cloud API"
3. Agrega:
   - **Access Token:** (El mismo token que usas en Alertas, está en `whatsapp-business-config.txt`)
   - **Business Account ID (WABA):** `1687233251972684`

### **6. Repite para Entrega Individual**

Localiza el nodo Gmail para Entrega Individual (después del Nodo 3) y agrega otro nodo WhatsApp con la **misma configuración**.

---

## 📊 Flujo Completo (Ejemplo)

### **Para HDR Completado:**

```
Webhook
  ↓
Nodo 1: Procesar Datos
  ↓
Google Sheets: Append Row
  ↓
IF: ¿HDR Completado?
  ↓ (SÍ)
Google Sheets: Lookup
  ↓
Nodo 2: Generar Email HDR Completado
  ↓
  ├─→ Gmail: Enviar Email ✅
  └─→ WhatsApp: Enviar WhatsApp ✅ (AGREGAR ESTE)
```

### **Para Entrega Individual:**

```
IF: ¿HDR Completado?
  ↓ (NO)
Nodo 3: Generar Email Individual
  ↓
  ├─→ Gmail: Enviar Email ✅
  └─→ WhatsApp: Enviar WhatsApp ✅ (AGREGAR ESTE)
```

---

## 🎨 Captura de Pantalla de Configuración

```
┌─────────────────────────────────────┐
│ Enviar WhatsApp - HDR Completado    │
├─────────────────────────────────────┤
│ Resource: message                   │
│ Operation: send                     │
│                                     │
│ Phone Number ID:                    │
│ 764420436762718                     │
│                                     │
│ Recipient Phone Number:             │
│ fx {{ $json.whatsapp.numero }}      │
│                                     │
│ Message Type: text                  │
│                                     │
│ Message:                            │
│ fx {{ $json.whatsapp.mensaje }}     │
│                                     │
│ Credentials:                        │
│ WhatsApp Business Cloud API ✅      │
└─────────────────────────────────────┘
```

---

## ✅ Verificación

Después de configurar, prueba el flujo:

### **1. Prueba Manual**

1. Ejecuta el workflow manualmente
2. Verifica que:
   - ✅ Se envía el email
   - ✅ Se envía el WhatsApp **SIN que hayas escrito primero**
   - ✅ El mensaje llega al número `5491154096639`

### **2. Revisa el Output del Nodo**

En el nodo WhatsApp, revisa la ejecución:
- ✅ Debería mostrar `success: true`
- ✅ No debería haber errores de "waiting for user message"

---

## 🔍 Troubleshooting

### **Error: "Recipient phone number not valid"**

**Causa:** El número no está en formato correcto

**Solución:**
- Verifica que el número sea: `5491154096639` (sin +, sin espacios)
- Formato: código país + número completo

---

### **Error: "Cannot send message, conversation not started"**

**Causa:** El nodo está esperando que el usuario escriba primero (configuración incorrecta)

**Solución:**
- Verifica que `Operation` sea `send` (NO `reply`)
- Verifica que `Resource` sea `message`

---

### **No envía WhatsApp pero sí Email**

**Causa:** El nodo WhatsApp no está conectado o no tiene credenciales

**Solución:**
1. Verifica que el nodo WhatsApp esté conectado después del Nodo 2/3
2. Verifica que tenga credenciales configuradas
3. Verifica que el Access Token sea válido

---

## 📝 Ejemplo de Mensaje que Recibirás

### **HDR Completado:**

```
*HDR 12345 - COMPLETADO* ✅

━━━━━━━━━━━━━━━━━━━━━
👤 *Chofer:* Juan Pérez
📅 *Fecha:* 09/11/2025
━━━━━━━━━━━━━━━━━━━━━

📊 *Resumen General*
✓ 3 entregas completadas
✓ 5 remitos entregados

📦 *Detalle de Entregas*

*Entrega N° 1*
🎯 ECOLAB - Planta Pilar
Remitos (2):
   12345 → https://drive.google.com/file/d/...
   12346 → https://drive.google.com/file/d/...
✍️ Recibió: María García

...

━━━━━━━━━━━━━━━━━━━━━

*Resumen enviado por email*

*CROSSLOG*
_Servicios Logísticos | Warehousing_
```

### **Entrega Individual:**

```
📦 *ENTREGA REGISTRADA*

━━━━━━━━━━━━━━━━━━━━━
🆔 *HDR:* 12345
📍 *Entrega N°:* 1
👤 *Chofer:* Juan Pérez
📅 *Fecha:* 09/11/2025
━━━━━━━━━━━━━━━━━━━━━

🎯 *Destino*
ECOLAB - Planta Pilar
✍️ *Recibió:* María García

*Remitos (2)*
• Remito 12345
  📄 https://drive.google.com/file/d/...
• Remito 12346
  📄 https://drive.google.com/file/d/...

📊 *Progreso del HDR*
✓ 1 de 3 entregas completadas
⏳ 2 pendientes
📈 33% completado

━━━━━━━━━━━━━━━━━━━━━

*Resumen enviado por email*

*CROSSLOG*
_Servicios Logísticos | Warehousing_
```

---

## 🎯 Resumen

### **Lo que TIENES:**
- ✅ Código JavaScript que prepara mensajes de WhatsApp
- ✅ Credenciales de WhatsApp Business API
- ✅ Phone Number ID verificado

### **Lo que FALTA:**
- ❌ Nodo de WhatsApp configurado en N8N
- ❌ Conexión entre el nodo Function y el nodo WhatsApp

### **Solución:**
1. Agregar nodo "WhatsApp" después de los nodos de Email
2. Configurar con `Phone Number ID: 764420436762718`
3. Usar expresiones `={{ $json.whatsapp.numero }}` y `={{ $json.whatsapp.mensaje }}`
4. Configurar credenciales de WhatsApp Business Cloud API

---

## 📚 Referencias

- **Access Token:** Ver archivo `whatsapp-business-config.txt` en proyecto Alertas
- **Phone Number ID:** `764420436762718`
- **WABA ID:** `1687233251972684`
- **Número de prueba:** `5491154096639`

---

**Fecha:** 09/11/2025
**Versión:** 1.0
**Estado:** ✅ Listo para implementar
