# Google Apps Script - Crosslog Documentos

Este script permite escribir datos en Google Sheets de forma segura desde la aplicación web.

## Instalación

### 1. Abrir el Editor de Apps Script
1. Abre tu spreadsheet de Sistema_Entregas en Google Sheets
2. Ve a **Extensiones > Apps Script**
3. Se abrirá el editor de código

### 2. Copiar el Código
1. Borra el código por defecto (`function myFunction() {}`)
2. Copia todo el contenido de `Code.gs`
3. Pégalo en el editor
4. Guarda (Ctrl+S o File > Save)
5. Dale un nombre al proyecto: "Crosslog Documentos API"

### 3. Desplegar como Web App
1. Click en **Deploy > New deployment**
2. Click en el ícono de engranaje ⚙️ junto a "Select type"
3. Selecciona **Web app**
4. Configura:
   - **Description**: "Crosslog Documentos API v1"
   - **Execute as**: **Me** (tu email)
   - **Who has access**: **Anyone** (Cualquiera)
5. Click en **Deploy**
6. Autoriza la aplicación (primera vez):
   - Click en "Review permissions"
   - Selecciona tu cuenta de Google
   - Click en "Advanced"
   - Click en "Go to [nombre del proyecto] (unsafe)"
   - Click en "Allow"
7. Copia la **Web app URL** que aparece (algo como: `https://script.google.com/macros/s/XXXXX/exec`)

### 4. Configurar en la App
1. Abre el archivo `.env` en la raíz del proyecto
2. Agrega la variable:
   ```
   VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
   ```
3. Reinicia el servidor de desarrollo (`npm run dev`)

## Estructura de las Hojas

### Choferes_Documentos
Columnas: `NombreChofer | Unidad | Tipo | NombreDocumento | FechaVencimiento | URLArchivo | EsPropio`

### Unidades_Documentos
Columnas: `NumeroUnidad | Tipo | NombreDocumento | FechaVencimiento | URLArchivo`

### Cuadernillos
Columnas: `NombreChofer | Mes | FechaEmision | FechaVencimiento | URLCuadernillo`

## Testing

Para probar que el script funciona:

1. En el editor de Apps Script, selecciona la función `testScript` en el dropdown
2. Click en "Run" (▶️)
3. Autoriza si es necesario
4. Verifica en la hoja "Choferes_Documentos" que se agregó una fila de prueba
5. Puedes borrar la fila de prueba después

## Actualizar el Script

Si necesitas hacer cambios:

1. Edita el código en el editor de Apps Script
2. Guarda (Ctrl+S)
3. Ve a **Deploy > Manage deployments**
4. Click en el ícono de editar (lápiz) ✏️
5. En "Version", selecciona "New version"
6. Click en "Deploy"
7. La URL no cambia, solo la versión interna

## Troubleshooting

### Error: "Script function not found"
- Verifica que copiaste todo el código correctamente
- Guarda el script (Ctrl+S)

### Error: "Authorization required"
- Ve a Deploy > Manage deployments
- Click en "Review permissions"
- Autoriza nuevamente

### Error: "Sheet not found"
- Verifica que las hojas existan en tu spreadsheet
- Los nombres deben ser exactamente: `Choferes_Documentos`, `Unidades_Documentos`, `Cuadernillos`

### No se agregan datos
- Verifica que la URL en `.env` sea correcta
- Abre la consola del navegador (F12) para ver errores
- Verifica los logs en Apps Script (View > Logs)
