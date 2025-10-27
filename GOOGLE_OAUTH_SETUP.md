# Configuración de Google OAuth 2.0 para Drive

Para que la aplicación pueda subir archivos a Google Drive, necesitas configurar OAuth 2.0 en Google Cloud Console.

## Pasos de Configuración

### 1. Ir a Google Cloud Console
Ve a: https://console.cloud.google.com/

### 2. Seleccionar o Crear un Proyecto
- Si ya tienes un proyecto (el mismo donde configuraste las APIs de Sheets), selecciónalo
- Si no, crea uno nuevo haciendo clic en "Crear proyecto"

### 3. Habilitar Google Drive API
1. En el menú lateral, ve a **APIs y servicios > Biblioteca**
2. Busca "Google Drive API"
3. Haz clic en "Habilitar"

### 4. Configurar Pantalla de Consentimiento OAuth
1. Ve a **APIs y servicios > Pantalla de consentimiento de OAuth**
2. Selecciona **Externo** (o Interno si tienes Google Workspace)
3. Haz clic en **Crear**
4. Completa los campos requeridos:
   - **Nombre de la aplicación**: CROSSLOG
   - **Correo electrónico de asistencia**: tu correo
   - **Correo electrónico del desarrollador**: tu correo
5. En **Ámbitos**, agrega:
   - `https://www.googleapis.com/auth/drive.file` (para crear y editar archivos)
6. Agrega **Usuarios de prueba** (tu correo y el de quien usará la app)
7. Guarda y continúa

### 5. Crear Credenciales OAuth 2.0
1. Ve a **APIs y servicios > Credenciales**
2. Haz clic en **+ CREAR CREDENCIALES** > **ID de cliente de OAuth**
3. Selecciona **Aplicación web**
4. Configura:
   - **Nombre**: CROSSLOG Web Client
   - **Orígenes de JavaScript autorizados**:
     - `http://localhost:5173` (para desarrollo)
     - Tu dominio de producción cuando lo tengas
   - **URIs de redirección autorizados**: (dejar vacío para este caso)
5. Haz clic en **Crear**

### 6. Copiar el Client ID
1. Una vez creado, verás un popup con tu **Client ID**
2. Copia el Client ID (se ve así: `xxxxx.apps.googleusercontent.com`)
3. Pégalo en el archivo `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   ```

### 7. Configurar Permisos de la Carpeta de Drive
1. Ve a tu carpeta de Google Drive: https://drive.google.com/drive/folders/1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ
2. Haz clic derecho > **Compartir**
3. Asegúrate de que tu cuenta de Google tiene permisos de **Editor** o **Propietario**

## Verificación

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la app en el navegador: http://localhost:5173

3. Al intentar subir un PDF (después de capturar foto y firma), se abrirá un popup de Google pidiendo que autorices la app

4. Acepta los permisos

5. El PDF se subirá automáticamente a tu carpeta de Google Drive

## Notas Importantes

- **Primera vez**: Cada usuario que use la app debe autorizar el acceso la primera vez
- **Token expira**: Los tokens de acceso expiran después de 1 hora, pero la app los renueva automáticamente
- **Usuarios de prueba**: Si la app está en modo "Testing", solo los usuarios agregados en la pantalla de consentimiento podrán usarla
- **Publicar**: Para uso general, debes solicitar verificación de Google (proceso que puede tomar semanas)

## Solución de Problemas

### Error: "Access blocked: Authorization Error"
- Asegúrate de haber agregado tu correo en "Usuarios de prueba"
- Verifica que el origen `http://localhost:5173` esté en "Orígenes autorizados"

### Error: "The OAuth client was not found"
- Verifica que el Client ID en `.env` sea correcto
- Asegúrate de haber reiniciado el servidor después de editar `.env`

### Error: "Insufficient Permission"
- Asegúrate de que la carpeta de Drive tenga permisos de escritura para tu cuenta
- Verifica que el ámbito `drive.file` esté configurado en la pantalla de consentimiento

## Más Información

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Docs](https://developers.google.com/drive/api/guides/about-sdk)
