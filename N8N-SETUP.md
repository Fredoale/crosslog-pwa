# N8N Setup - CROSSLOG PWA

**Guía completa de configuración del flujo de automatización con N8N**

---

## 📋 Estructura de Google Sheets

### Hoja: `Sistema_entregas`

| Columna | Nombre | Tipo | Ejemplo |
|---------|--------|------|---------|
| A | `fecha_viaje` | Texto | `25-09-2025` |
| B | `Numero_HDR` | Texto | `7366289` |
| C | `numero_entrega` | Texto | `1` |
| D | `numero_remitos` | JSON Array | `["38269"]` |
| E | `Dador_carga` | Texto | `SCC POWER - SAN PEDRO` |
| F | `Detalle_entrega` | Texto | `SCC POWER - SAN PEDRO` |
| G | `Estado` | Texto | `COMPLETADO` |
| H | `Chofer` | Texto | `Martin Romero` |
| I | `Cant_remito` | Número | `1` |
| J | `entregas_completadas` | Número | `1` |
| K | `entregas_pendientes` | Número | `1` |
| L | `progreso_porcentaje` | Número | `50` |
| M | `firma_receptor` | Texto | `Alfredo Flores` ⚠️ **NO URL** |
| N | `pdf_urls` | JSON Array | `["https://drive.google.com/file/d/..."]` |

---

## 🔄 Flujo Completo N8N

```
┌─────────────────┐
│  1. Webhook     │ Recibe datos de la PWA
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Code        │ Nodo 1: Procesar datos
│  (Nodo 1)       │ - Validar firma_receptor (no URL)
└────────┬────────┘ - Convertir remitos/PDFs a JSON
         │          - Corregir URLs (/fbs/d/ → /file/d/)
         ▼
┌─────────────────┐
│  3. Google      │ Escribir en Sistema_entregas
│     Sheets      │ Mapeo columnas A-N
│  (Append)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. IF Node     │ ¿HDR Completado?
└────┬───────┬────┘
     │       │
     │ NO    │ SÍ (entregasPendientes === 0)
     │       │
     ▼       ▼
┌────────┐  ┌──────────────────┐
│ Nodo 3 │  │ 5. Google Sheets │ Buscar TODAS las entregas del HDR
│        │  │    (Lookup)      │ Lookup Column: B (Numero_HDR)
└───┬────┘  └─────────┬────────┘ Return All Matches: YES
    │                 │
    │                 ▼
    │       ┌─────────────────┐
    │       │ 6. Code         │ Nodo 2: Generar HTML completo
    │       │    (Nodo 2)     │ - Procesar todas las entregas
    │       └────────┬────────┘ - Crear links a PDFs
    │                │          - Contar remitos/entregas
    │                │
    ├────────────────┤
    │                │
    ▼                ▼
┌────────────┐  ┌────────────┐
│ 7. Gmail   │  │ 8. Gmail   │
│ (Individual)│  │ (Completo) │
└─────┬──────┘  └──────┬─────┘
      │                │
      ▼                ▼
┌────────────┐  ┌────────────┐
│ 9. WhatsApp│  │10. WhatsApp│
└────────────┘  └────────────┘
```

---

## 🛠️ Configuración de Nodos N8N

### **1. Webhook**
- **URL**: `https://tu-n8n.com/webhook/crosslog-entregas`
- **Method**: POST
- **Authentication**: None (o configurar según necesidad)

### **2. Code - Nodo 1: Procesar Datos**

**Código completo**: Ver archivo `N8N-FLUJO-COMPLETO.js` - NODO 1 (líneas 1-123)

**Qué hace:**
- Extrae datos del webhook
- Valida que `firma_receptor` no sea un URL
- Convierte `numeros_remito` y `pdf_urls` a JSON strings
- Corrige URLs malformados (`/fbs/d/` → `/file/d/`)
- Prepara objeto `googleSheets` con estructura A-N

### **3. Google Sheets - Append**
- **Operation**: Append
- **Spreadsheet**: Tu spreadsheet ID
- **Sheet**: `Sistema_entregas`
- **Range**: `A:N`

**Mapeo de columnas:**
```
Column A: {{ $json.googleSheets.fecha_viaje }}
Column B: {{ $json.googleSheets.Numero_HDR }}
Column C: {{ $json.googleSheets.numero_entrega }}
Column D: {{ $json.googleSheets.numero_remitos }}
Column E: {{ $json.googleSheets.Dador_carga }}
Column F: {{ $json.googleSheets.Detalle_entrega }}
Column G: {{ $json.googleSheets.Estado }}
Column H: {{ $json.googleSheets.Chofer }}
Column I: {{ $json.googleSheets.Cant_remito }}
Column J: {{ $json.googleSheets.entregas_completadas }}
Column K: {{ $json.googleSheets.entregas_pendientes }}
Column L: {{ $json.googleSheets.progreso_porcentaje }}
Column M: {{ $json.googleSheets.firma_receptor }}
Column N: {{ $json.googleSheets.pdf_urls }}
```

### **4. IF Node**
- **Condition**: `{{ $json.hdrCompletado }}` equals `true`
- **True**: Continuar a Google Sheets Lookup
- **False**: Ir a Nodo 3 (Email Individual)

### **5. Google Sheets - Lookup** (Solo si HDR completado)
- **Operation**: Lookup
- **Spreadsheet**: Tu spreadsheet ID
- **Sheet**: `Sistema_entregas`
- **Lookup Column**: B (`Numero_HDR`)
- **Lookup Value**: `{{ $json.hdr }}`
- **Return All Matches**: ✅ YES

### **6. Code - Nodo 2: Generar HTML para HDR Completado**

**Código completo**: Ver archivo `N8N-FLUJO-COMPLETO.js` - NODO 2 (líneas 126-306)

**Qué hace:**
- Recibe TODAS las entregas del Google Sheets Lookup
- Parsea `numero_remitos` y `pdf_urls` (JSON arrays)
- Parsea destinos que vienen en formato JSON array
- Genera HTML con detalle de cada entrega separada
- Crea links clickeables a PDFs
- Prepara datos para Gmail y WhatsApp

**Mejoras aplicadas:**
- ✅ Destinos sin JSON arrays (parsing automático)
- ✅ Formato estilo PWA con tarjetas y badges "Completado"
- ✅ Secciones claramente divididas
- ✅ Console logs para debugging

### **7. Code - Nodo 3: Generar HTML para Entrega Individual**

**Código completo**: Ver archivo `N8N-FLUJO-COMPLETO.js` - NODO 3 (líneas 309-416)

**Qué hace:**
- Procesa entrega individual
- Muestra progreso del HDR
- Genera HTML con remitos y PDFs
- Prepara datos para Gmail y WhatsApp

**Mejoras aplicadas:**
- ✅ Código defensivo con fallbacks múltiples
- ✅ No más "undefined" o "NaN" en los emails
- ✅ Todos los campos se muestran correctamente

### **8. Gmail - Email HDR Completado**
- **To**: `{{ $json.email.toEmail }}`
- **Subject**: `{{ $json.email.subject }}`
- **Email Type**: HTML
- **Message**: Copiar plantilla de `N8N-FLUJO-COMPLETO.js` - **PLANTILLA HTML - EMAIL HDR COMPLETADO** (líneas 425-504)

### **9. Gmail - Email Entrega Individual**
- **To**: `{{ $json.email.toEmail }}`
- **Subject**: `{{ $json.email.subject }}`
- **Email Type**: HTML
- **Message**: Copiar plantilla de `N8N-FLUJO-COMPLETO.js` - **PLANTILLA HTML - EMAIL ENTREGA INDIVIDUAL** (líneas 507-567)

### **10. WhatsApp - HDR Completado**

**Configuración del nodo HTTP Request:**
- **Method**: `POST`
- **URL**: `https://graph.facebook.com/v22.0/764420436762718/messages`
- **Authentication**: Header Auth
  - Name: `Authorization`
  - Value: `Bearer TU_ACCESS_TOKEN`
- **Body Content Type**: JSON
- **Body**:
```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.whatsapp.numero }}",
  "type": "text",
  "text": {
    "body": "{{ $json.whatsapp.mensaje }}"
  }
}
```

**Formato del mensaje WhatsApp (generado por Nodo 2):**
```
🎉 *HDR 708090 - COMPLETADO* ✅

━━━━━━━━━━━━━━━━━━━━━
👤 *Chofer:* Juan Pérez
📅 *Fecha:* 20/10/2025
━━━━━━━━━━━━━━━━━━━━━

📊 *Resumen General*
✓ 2 entregas completadas
✓ 2 remitos entregados

📦 *Detalle de Entregas*

*Entrega N° 1* ✅
📍 SCC POWER - SAN PEDRO
📄 Remito (1): 38269
✍️ Recibió: Alfredo Flores

*Entrega N° 2* ✅
📍 SOFTYS ARGENTINA - ZARATE
📄 Remito (1): 102030
✍️ Recibió: Mari

━━━━━━━━━━━━━━━━━━━━━

📧 *Detalles completos enviados por email*

🚛 *CROSSLOG*
_Servicios Logísticos | Warehousing_
```

### **11. WhatsApp - Entrega Individual**

Misma configuración que el nodo 10, conectado después del Gmail de entrega individual.

**Formato del mensaje WhatsApp (generado por Nodo 3):**
```
📦 *ENTREGA REGISTRADA*

━━━━━━━━━━━━━━━━━━━━━
🆔 *HDR:* 708090
📍 *Entrega N°:* 1
👤 *Chofer:* Juan Pérez
📅 *Fecha:* 20/10/2025
━━━━━━━━━━━━━━━━━━━━━

🎯 *Destino*
SCC POWER - SAN PEDRO
✍️ *Recibió:* Alfredo Flores

📄 *Remitos (1)*
• Remito 38269

📊 *Progreso del HDR*
✓ 1 de 2 entregas completadas
⏳ 1 pendiente
📈 50% completado

━━━━━━━━━━━━━━━━━━━━━

📧 *Detalles completos enviados por email*

🚛 *CROSSLOG*
_Servicios Logísticos | Warehousing_
```

---

## 📱 Configuración de WhatsApp Business Cloud

### Credenciales
```
Business Account ID: 1687233251972684
Phone Number ID: 764420436762718
Número destino: 5491154096639
```

### Obtener Access Token Permanente

1. Ir a https://business.facebook.com/settings
2. Users → System Users → Crear System User
3. Add Assets → Seleccionar WhatsApp Business Account
4. Generate New Token:
   - Permisos: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Expiración: **Never**
5. Copiar token y usar en el nodo HTTP Request

---

## 🧪 Testing

### **Test 1: Entrega Individual**
1. Completa una entrega en la PWA (1 de 2)
2. Verifica en Google Sheets:
   - ✅ Columna M tiene NOMBRE (no URL)
   - ✅ Columna N tiene JSON: `["https://..."]`
   - ✅ Columna F tiene destino sin JSON arrays
3. Verifica en tu email:
   - ✅ Asunto: "📦 Entrega Registrada - HDR XXXX - Entrega 1"
   - ✅ Muestra progreso: "1 de 2 entregas (50%)"
   - ✅ Muestra chofer, fecha, destino correctamente
   - ✅ Link a PDF funciona
4. Verifica WhatsApp:
   - ✅ Mensaje con formato profesional
   - ✅ Todos los campos presentes (no "undefined")

### **Test 2: HDR Completado**
1. Completa la última entrega
2. Verifica en tu email:
   - ✅ Asunto: "✅ HDR XXXX COMPLETADO - [Chofer]"
   - ✅ Muestra resumen: "2 Entregas, X Remitos"
   - ✅ Detalle de TODAS las entregas separadas
   - ✅ Cada entrega tiene badge "Completado" verde
   - ✅ Destinos sin JSON arrays (texto limpio)
   - ✅ Links a PDFs funcionan
3. Verifica WhatsApp:
   - ✅ Mensaje de confirmación con detalle de todas las entregas
   - ✅ Formato profesional con emojis

### **Test 3: Recargar HDR Parcialmente Completado**
1. Cierra la app
2. Vuelve a abrir e ingresa el HDR
3. Verifica:
   - ✅ Muestra lista (NO resumen)
   - ✅ Entrega 1: COMPLETADO con "Ver PDF"
   - ✅ Entrega 2: PENDIENTE con botón para capturar

---

## 🔧 Troubleshooting

### **Problema: PDFs muestran "URL inválida"**
**Solución:**
- Verificar que columna N en Google Sheets tenga URLs en formato JSON: `["https://..."]`
- Verificar que los URLs empiecen con `https://drive.google.com/file/d/`
- El Nodo 1 automáticamente corrige `/fbs/d/` a `/file/d/`

### **Problema: firma_receptor tiene un URL**
**Solución:**
- El Nodo 1 valida y limpia automáticamente
- Si `firma_receptor.startsWith('http')`, se borra el valor

### **Problema: Destinos aparecen como JSON arrays en el email**
**Ejemplo**: `["SCC POWER - SAN PEDRO"]` en lugar de `SCC POWER - SAN PEDRO`

**Solución:**
- El Nodo 2 ahora parsea automáticamente (líneas 219-230)
- Detecta si el string empieza con `[` y termina con `]`
- Extrae el primer elemento del array

### **Problema: Email individual muestra "undefined" o "NaN"**
**Solución:**
- El Nodo 3 actualizado tiene código defensivo con múltiples fallbacks
- Lee datos del webhook y también de Google Sheets
- Calcula correctamente el total de entregas

### **Problema: Nodo 2 da error "Cannot read properties of undefined (reading 'Chofer')"**
**Solución:**
- Verificar que Google Sheets Lookup esté configurado con "Return All Matches: YES"
- El Nodo 2 ahora lee directamente de las filas devueltas por el Lookup
- Las columnas vienen como: `Numero_HDR`, `Chofer`, `fecha_viaje` (sin nesting)

### **Problema: HDR completado no muestra todas las entregas en el email**
**Solución:**
- Verificar que el Google Sheets Lookup esté buscando por columna B (`Numero_HDR`)
- Verificar que "Return All Matches" esté en YES
- Verificar que esté buscando en la hoja `Sistema_entregas`

### **Problema: WhatsApp - Error "JSON parameter needs to be valid JSON"**
**Solución:**
1. En el nodo HTTP Request, verificar que "Body Content Type" esté en **JSON** (no Raw)
2. En el campo JSON, pegar exactamente:
```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.whatsapp.numero }}",
  "type": "text",
  "text": {
    "body": "{{ $json.whatsapp.mensaje }}"
  }
}
```
3. **NO agregar comillas externas** alrededor del JSON
4. Verificar que las comillas sean **rectas** `"` y no curvas `""`

### **Problema: WhatsApp - Error 403 o 401 (Token Inválido)**
**Solución:**
- Necesitas un token permanente de WhatsApp Business (ver sección "Configuración de WhatsApp Business Cloud")
- Token temporal expira en 24 horas
- Generar System User Token con expiración "Never"

### **Problema: El mensaje de WhatsApp no llega**
**Verificar:**
1. ✅ El número `5491154096639` está registrado en WhatsApp
2. ✅ El número está verificado en Meta Business
3. ✅ Tienes créditos/balance en tu cuenta de WhatsApp Business
4. ✅ El teléfono no está en una cuenta de WhatsApp Business diferente
5. ✅ Phone Number ID correcto: `764420436762718`

---

## 📝 Checklist de Verificación

### Google Sheets
- [ ] Hoja Sistema_entregas existe y tiene columnas A-N
- [ ] Columna B tiene Numero_HDR
- [ ] Columna D tiene numero_remitos en formato JSON `["123"]`
- [ ] Columna N tiene pdf_urls en formato JSON `["https://..."]`
- [ ] Columna M tiene firma_receptor como TEXTO (no URL)

### N8N
- [ ] Nodo 1 (Procesar) actualizado
- [ ] Nodo 2 (Email Completo) actualizado con nuevo código
- [ ] Nodo 3 (Email Individual) actualizado con nuevo código
- [ ] Google Sheets Lookup busca en `Sistema_entregas`
- [ ] Google Sheets Lookup tiene "Return All Matches: YES"
- [ ] IF Node conectado correctamente (TRUE → Nodo 2, FALSE → Nodo 3)
- [ ] Nodos Gmail configurados con plantillas HTML
- [ ] Nodos HTTP Request para WhatsApp configurados

### WhatsApp
- [ ] Token de WhatsApp válido y permanente
- [ ] Número `5491154096639` verificado en Meta Business
- [ ] Business Account ID correcto: `1687233251972684`
- [ ] Phone Number ID correcto: `764420436762718`
- [ ] HTTP Request en método POST
- [ ] Body en formato JSON (no Raw)
- [ ] URL correcta: `https://graph.facebook.com/v22.0/764420436762718/messages`

### Testing
- [ ] Probado con 1 entrega individual - email correcto
- [ ] Probado con 1 entrega individual - WhatsApp recibido
- [ ] Probado con HDR completo - email muestra TODAS las entregas
- [ ] Probado con HDR completo - destinos sin JSON arrays
- [ ] Probado con HDR completo - badge "Completado" visible
- [ ] Probado con HDR completo - WhatsApp recibido
- [ ] Links a PDFs funcionan

---

## 🎉 Resultado Final

Con este setup, tu flujo N8N logra:

✅ Envía emails con formato profesional estilo PWA
✅ Separa cada entrega claramente con badge "Completado"
✅ Muestra destinos limpios (sin JSON arrays)
✅ Envía notificaciones por WhatsApp con toda la información
✅ No tiene errores de "undefined" o "NaN"
✅ Funciona con datos de Estado_progreso O Sistema_entregas
✅ Tiene logs para debugging fácil
✅ Formato profesional con branding CROSSLOG

---

## 📧 Contacto

Para soporte o consultas sobre la implementación:
- Email: logistica@crosslog.com.ar
- Proyecto: CROSSLOG PWA
- Versión: 1.1.0

---

**Última actualización**: 21 de Octubre 2025
**Versión**: 3.0 (Consolidado)

---

## 📜 Licencia

Proyecto propietario de CROSSLOG - Servicios Logísticos | Warehousing
