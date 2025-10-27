# Configuración de CORS en N8N

## Problema
La aplicación no puede enviar datos a N8N porque el webhook está bloqueando peticiones desde localhost por CORS (Cross-Origin Resource Sharing).

**Error en consola:**
```
POST https://fredoale.app.n8n.cloud/webhook-test/crosslog-entregas net::ERR_FAILED
TypeError: Failed to fetch
```

## Solución: Configurar CORS en N8N

### Opción 1: Configurar Headers en el Nodo Webhook

1. **Abre tu workflow en N8N**
   - Ve a: https://fredoale.app.n8n.cloud

2. **Edita el nodo "Webhook"**
   - Haz clic en el nodo que tiene la URL `/webhook-test/crosslog-entregas`

3. **Agrega Response Headers**

   En la pestaña "Settings" o "Response" del webhook, agrega estos headers:

   | Header Name | Value |
   |------------|-------|
   | `Access-Control-Allow-Origin` | `*` |
   | `Access-Control-Allow-Methods` | `POST, OPTIONS, GET` |
   | `Access-Control-Allow-Headers` | `Content-Type, Accept` |

4. **Guarda y activa el workflow**

### Opción 2: Agregar un Nodo "Set" después del Webhook

Si la opción 1 no funciona, agrega un nodo "Set" o "HTTP Response" después del webhook:

1. **Agregar nodo "HTTP Response"** después del webhook

2. **Configurar los headers:**
   ```javascript
   {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
     "Access-Control-Allow-Headers": "Content-Type, Accept",
     "Content-Type": "application/json"
   }
   ```

### Opción 3: Usar un Proxy Local (Temporal)

Si no puedes modificar N8N, puedes usar un proxy local temporalmente:

1. Instala un proxy CORS local:
   ```bash
   npm install -g local-cors-proxy
   ```

2. Ejecuta el proxy:
   ```bash
   lcp --proxyUrl https://fredoale.app.n8n.cloud
   ```

3. Cambia la URL en `.env`:
   ```
   VITE_N8N_WEBHOOK_URL=http://localhost:8010/proxy/webhook-test/crosslog-entregas
   ```

## Verificación

Para verificar que CORS está configurado correctamente:

1. Abre la consola del navegador (F12)
2. Ejecuta:
   ```javascript
   fetch('https://fredoale.app.n8n.cloud/webhook-test/crosslog-entregas', {
     method: 'OPTIONS'
   }).then(r => console.log('CORS headers:', r.headers))
   ```

Deberías ver los headers CORS en la respuesta.

## Datos que se Envían

La app envía este formato JSON a N8N:

```json
{
  "hdr": "7372022",
  "numero_entrega": "1",
  "numeros_remito": ["37849", "37850"],
  "cliente": "SEABOARD ENERGIAS RENOVABLES",
  "cliente_nombre_completo": "ECOLAB",
  "detalle_entregas": "SEABOARD ENERGIAS RENOVABLES - TRADELOG",
  "estado": "COMPLETADO",
  "chofer": "Lucas Zurita",
  "firma_receptor": "Alfredo F",
  "timestamp": "2025-10-16T21:23:24.280Z",
  "fecha_viaje": "02-10-2025",
  "pdf_urls": [
    "https://drive.google.com/file/d/.../view?usp=drivesdk",
    "https://drive.google.com/file/d/.../view?usp=drivesdk"
  ],
  "numero_remitos": 2,
  "geolocalizacion": {
    "lat": -34.603722,
    "lng": -58.381592,
    "accuracy": 10
  },
  "progreso": {
    "total_entregas": 3,
    "entregas_completadas": 1,
    "entregas_pendientes": 2,
    "progreso_porcentaje": 33
  },
  "version_app": "1.0.0"
}
```

## Referencias

- [N8N Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
