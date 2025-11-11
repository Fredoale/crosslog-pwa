# 🔐 Credenciales y Configuración - Integración SharePoint Ecolab

**Proyecto**: CROSSLOG PWA - Upload automático de remitos a SharePoint
**Cliente**: Ecolab
**Fecha**: 21 de Octubre 2025
**Volumen**: 5-15 remitos PDF por día

---

## 📋 Resumen Ejecutivo

### ¿Qué necesitamos?

Integrar el sistema CROSSLOG PWA con SharePoint de Ecolab para subir automáticamente los remitos (PDFs) a la carpeta:
```
SharePoint: josefina.dugo@ecolab.com/Documents/REMITOS CROSSLOG
URL: https://ecolab-my.sharepoint.com/personal/josefina_dugo_ecolab_com/Documents/REMITOS%20CROSSLOG
```

### ¿Por qué?

Actualmente el proceso es:
1. ❌ Chofer completa entrega
2. ❌ Se genera PDF y sube a Google Drive
3. ❌ Se envía email con link
4. ❌ Alguien de Ecolab debe **descargar y subir manualmente a SharePoint**

Con la integración:
1. ✅ Chofer completa entrega
2. ✅ PDF se sube **automáticamente** a Google Drive **Y SharePoint de Ecolab**
3. ✅ Aparece instantáneamente en la carpeta de Josefina
4. ✅ **0 intervención manual**

---

## 🎯 Lo que necesitamos que Ecolab configure

### 1. Registrar una aplicación en Azure AD

**Solicitante**: Equipo de IT de Ecolab
**Tiempo estimado**: 15-20 minutos
**Quién puede hacerlo**: Administrador de Azure AD de Ecolab

#### Pasos que debe hacer IT de Ecolab:

1. **Ir a Azure Portal**
   - URL: https://portal.azure.com
   - Iniciar sesión con cuenta de administrador

2. **Registrar nueva aplicación**
   - Ir a: Azure Active Directory → App registrations → New registration
   - **Name**: `CROSSLOG Integration`
   - **Supported account types**: Accounts in this organizational directory only (Ecolab only - Single tenant)
   - **Redirect URI**:
     - Platform: `Web`
     - URL: `https://crosslog-entregas.netlify.app/callback`
   - Click: **Register**

3. **Anotar credenciales** (IMPORTANTE - Necesitamos estos datos):
   - ✅ **Application (client) ID**: Proporcionado por IT de Ecolab
   - ✅ **Directory (tenant) ID**: Proporcionado por IT de Ecolab

4. **Crear Client Secret** (contraseña de la app):
   - Ir a: Certificates & secrets → New client secret
   - **Description**: `CROSSLOG PWA Secret`
   - **Expires**: 24 months (recomendado)
   - Click: **Add**
   - ⚠️ **COPIAR EL VALOR INMEDIATAMENTE** (solo se muestra una vez)
   - ✅ **Client Secret Value**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Configurar permisos API**:
   - Ir a: API permissions → Add a permission → Microsoft Graph → Application permissions
   - Agregar estos permisos:
     - ✅ `Sites.ReadWrite.All` - Escribir en SharePoint
     - ✅ `Files.ReadWrite.All` - Subir archivos
   - Click: **Grant admin consent for Ecolab** (IMPORTANTE - Requiere admin)
   - Status debe decir: ✅ Granted for Ecolab

6. **Obtener información del sitio SharePoint**:
   - Ir a: https://ecolab-my.sharepoint.com/personal/josefina_dugo_ecolab_com
   - Click derecho → "Inspeccionar" → Console
   - Ejecutar: `_spPageContextInfo.webAbsoluteUrl`
   - Copiar el resultado completo
   - ✅ **Site URL**: (anotar)

---

## 📝 Checklist de Credenciales a Solicitar

```
[ ] Application (client) ID: ________________________________
[ ] Directory (tenant) ID: __________________________________
[ ] Client Secret Value: ____________________________________
[ ] Site URL completo: _______________________________________
[ ] Nombre de la carpeta destino: REMITOS CROSSLOG
[ ] Email de contacto IT: ___________________________________
[ ] Permisos aprobados por Admin: Sites.ReadWrite.All + Files.ReadWrite.All
```

---

## 📧 Email Template para Solicitud Formal

**Asunto**: Solicitud de Integración Azure AD - CROSSLOG PWA

**Para**: IT Department / Azure Administrator - Ecolab

---

Estimado equipo de IT de Ecolab,

Somos CROSSLOG, su proveedor de servicios logísticos. Actualmente gestionamos entregas diarias de remitos que necesitamos compartir con ustedes.

**Situación actual**:
- Generamos 5-15 PDFs de remitos por día
- Los subimos a Google Drive
- Enviamos emails con links de descarga
- Requiere intervención manual para subir a SharePoint

**Propuesta de mejora**:
Integrar nuestro sistema con su SharePoint mediante Microsoft Graph API para subir automáticamente los PDFs a la carpeta de Josefina Dugo:
`/personal/josefina_dugo_ecolab_com/Documents/REMITOS CROSSLOG`

**Beneficios para Ecolab**:
- ✅ PDFs aparecen automáticamente en SharePoint
- ✅ 0 intervención manual
- ✅ Trazabilidad completa
- ✅ Acceso inmediato a documentación

**Lo que necesitamos**:
1. Registro de una aplicación en Azure AD de Ecolab
2. Permisos: `Sites.ReadWrite.All` y `Files.ReadWrite.All`
3. Las siguientes credenciales (ver documento adjunto para detalles):
   - Application (client) ID
   - Directory (tenant) ID
   - Client Secret
   - Site URL completo

**Seguridad**:
- La integración utiliza OAuth 2.0 (estándar de Microsoft)
- Acceso limitado únicamente a la carpeta específica
- Trazabilidad completa de todas las operaciones
- Credenciales encriptadas y almacenadas de forma segura

**Documentación**:
Adjuntamos guía completa con pasos detallados para la configuración.

**Tiempo estimado de configuración**: 15-20 minutos

¿Podrían ayudarnos con esta integración? Quedamos a disposición para cualquier consulta técnica.

Saludos cordiales,
CROSSLOG - Servicios Logísticos

---

## 🏗️ Arquitectura Técnica (para IT de Ecolab)

### Flujo de Autenticación

```
┌─────────────────┐
│  CROSSLOG PWA   │
└────────┬────────┘
         │
         │ 1. Request Access Token
         ▼
┌─────────────────────────────┐
│   Azure AD - Ecolab Tenant  │
│   (Client ID + Secret)      │
└────────┬────────────────────┘
         │
         │ 2. Return Access Token
         ▼
┌─────────────────────────────┐
│   Microsoft Graph API       │
│   graph.microsoft.com       │
└────────┬────────────────────┘
         │
         │ 3. Upload PDF
         ▼
┌─────────────────────────────┐
│   SharePoint Online         │
│   ecolab-my.sharepoint.com  │
│   /REMITOS CROSSLOG         │
└─────────────────────────────┘
```

### Endpoints Utilizados

1. **Autenticación**:
   ```
   POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
   ```

2. **Upload de archivo**:
   ```
   PUT https://graph.microsoft.com/v1.0/sites/{site-id}/drive/root:/REMITOS CROSSLOG/{filename}.pdf:/content
   ```

### Datos Enviados (por cada PDF)

```json
{
  "filename": "Remito_38269_Ecolab_20251021.pdf",
  "size": "~500KB",
  "content-type": "application/pdf",
  "metadata": {
    "hdr": "708090",
    "remito": "38269",
    "chofer": "Juan Pérez",
    "fecha": "21/10/2025"
  }
}
```

---

## 🔒 Seguridad y Permisos

### Permisos Solicitados

| Permiso | Tipo | Justificación | Scope |
|---------|------|---------------|-------|
| `Sites.ReadWrite.All` | Application | Acceso a SharePoint | Solo carpeta específica |
| `Files.ReadWrite.All` | Application | Subir archivos | Solo PDFs de remitos |

### Medidas de Seguridad

✅ **OAuth 2.0**: Autenticación estándar de Microsoft
✅ **Client Secret**: Almacenado encriptado (no en código fuente)
✅ **HTTPS**: Todas las comunicaciones encriptadas
✅ **Scope limitado**: Solo carpeta "REMITOS CROSSLOG"
✅ **Logs completos**: Registro de todas las operaciones
✅ **Tokens de corta duración**: Renovación automática cada hora

### Accesos

- **Lectura**: ❌ CROSSLOG NO lee archivos existentes
- **Escritura**: ✅ Solo creación de nuevos PDFs
- **Eliminación**: ❌ NO puede borrar archivos
- **Modificación**: ❌ NO puede editar archivos existentes
- **Carpetas**: ✅ Solo "REMITOS CROSSLOG"

---

## 🛠️ Implementación Técnica

### Stack Tecnológico

```
Frontend (PWA):
├── React 19.1.1 + TypeScript 5.7
├── Checkbox "Enviar a Ecolab" en cada entrega
└── Envía flag al backend

Backend (N8N):
├── Nodo HTTP Request - Microsoft Graph
├── Autenticación OAuth 2.0
├── Upload PDF a SharePoint
└── Logs de confirmación
```

### Librerías Utilizadas

- `@microsoft/microsoft-graph-client` - Cliente oficial de Microsoft Graph
- `@azure/msal-node` - Autenticación Microsoft (MSAL)

### Formato de Archivos

```
Nombre: Remito_{numero}_{cliente}_{fecha}.pdf
Ejemplo: Remito_38269_Ecolab_20251021.pdf

Ubicación: /personal/josefina_dugo_ecolab_com/Documents/REMITOS CROSSLOG/
```

---

## 📊 Estimación de Complejidad

### Nivel de Complejidad: ⭐⭐⭐ (Medio)

**Para IT de Ecolab**:
- ⏱️ Tiempo de configuración: **15-20 minutos**
- 🔧 Complejidad técnica: **Baja** (pasos guiados)
- 👤 Requiere: Administrador de Azure AD
- 📚 Conocimiento previo: No necesario (guía incluida)

**Para CROSSLOG (desarrollo)**:
- ⏱️ Tiempo de implementación: **4-6 horas**
- 🔧 Complejidad técnica: **Media**
- ✅ Similar a Google Drive (ya implementado)

### Comparación

| Aspecto | Google Drive | SharePoint Ecolab |
|---------|--------------|-------------------|
| Autenticación | OAuth 2.0 | OAuth 2.0 (igual) |
| API | Google Drive API | Microsoft Graph API |
| Permisos | Cloud Console | Azure AD |
| Complejidad | Media | Media (similar) |
| Ya implementado | ✅ SÍ | ⏳ Pendiente |

---

## 📅 Plan de Implementación

### FASE 1: Obtener Credenciales (1 día)
- [ ] Enviar email formal a IT de Ecolab
- [ ] Esperar respuesta con credenciales
- [ ] Validar permisos en Azure Portal

### FASE 2: Desarrollo (1 día)
- [ ] Agregar checkbox "Enviar a Ecolab" en PWA
- [ ] Implementar autenticación Microsoft Graph
- [ ] Crear función de upload a SharePoint
- [ ] Integrar con N8N

### FASE 3: Testing (Medio día)
- [ ] Pruebas en ambiente de desarrollo
- [ ] Upload de PDF de prueba a SharePoint
- [ ] Validar permisos y accesos
- [ ] Verificar formato de archivos

### FASE 4: Deploy (Medio día)
- [ ] Deploy a producción
- [ ] Testing con remito real
- [ ] Validación con Josefina (Ecolab)
- [ ] Documentación final

**Total estimado**: 2-3 días desde obtención de credenciales

---

## 🧪 Proceso de Testing

### Test 1: Autenticación
```bash
✓ Conectar con Azure AD
✓ Obtener access token
✓ Validar token
```

### Test 2: Conexión a SharePoint
```bash
✓ Listar carpeta "REMITOS CROSSLOG"
✓ Verificar permisos de escritura
```

### Test 3: Upload de PDF
```bash
✓ Generar PDF de prueba
✓ Subir a SharePoint
✓ Verificar que aparece en OneDrive
✓ Verificar metadata correcta
```

### Test 4: Flujo Completo
```bash
✓ Completar entrega en PWA
✓ Marcar checkbox "Enviar a Ecolab"
✓ Generar PDF
✓ Upload a Google Drive (OK)
✓ Upload a SharePoint Ecolab (OK)
✓ Verificar en ambas ubicaciones
```

---

## ❓ FAQ - Preguntas Frecuentes

### ¿Qué pasa si el upload falla?

- El sistema reintenta automáticamente 3 veces
- Si falla, guarda el PDF localmente y envía alerta
- No afecta el upload a Google Drive (funciona independientemente)

### ¿Cuánto espacio ocupa en SharePoint?

- Cada PDF: ~500KB
- 15 PDFs/día × 30 días = ~225MB/mes
- Espacio insignificante en SharePoint

### ¿Se pueden subir PDFs antiguos?

- Sí, podemos hacer un script de migración
- Sube todos los PDFs existentes de Google Drive a SharePoint

### ¿Qué pasa si cambian la carpeta?

- Se actualiza fácilmente en la configuración
- No requiere nuevos permisos si es en el mismo sitio

### ¿Los PDFs se pueden eliminar?

- Desde SharePoint: Sí (Ecolab tiene control total)
- Desde CROSSLOG: No (solo subimos, no eliminamos)

### ¿Hay costo adicional?

- Para Ecolab: **NO** (ya tienen SharePoint con M365)
- Para CROSSLOG: **NO** (solo desarrollo inicial)

### ¿Qué pasa cuando expire el Client Secret (24 meses)?

- Azure AD envía notificaciones 30 días antes
- Se genera un nuevo secret
- Se actualiza en configuración (5 minutos)

---

## 📞 Contactos

### CROSSLOG
- **Proyecto**: PWA Sistema de Entregas
- **Contacto técnico**: [Tu nombre/email]
- **Soporte**: logistica@crosslog.com.ar

### Ecolab (a completar)
- **IT Contact**: _______________________
- **Email**: _______________________
- **Azure AD Admin**: _______________________

---

## 📎 Anexos

### A. Screenshot de Azure Portal
(Pedir a IT de Ecolab que tome capturas durante el proceso)

### B. Ejemplo de PDF
```
Nombre: Remito_38269_Ecolab_20251021.pdf
Tamaño: ~500KB
Formato: PDF/A (archivable)
Contenido:
  - Logo Crosslog
  - Datos del HDR
  - Detalles de entrega
  - Remitos escaneados
  - Firma del receptor
  - Geolocalización
```

### C. Estructura de Carpetas en SharePoint
```
/personal/josefina_dugo_ecolab_com/Documents/
└── REMITOS CROSSLOG/
    ├── Remito_38269_Ecolab_20251021.pdf
    ├── Remito_38270_Ecolab_20251021.pdf
    ├── Remito_38271_Ecolab_20251022.pdf
    └── ...
```

---

## ✅ Próximos Pasos

1. **Revisar este documento** con tu equipo
2. **Enviar email formal** a IT de Ecolab (usar template arriba)
3. **Esperar credenciales** (Application ID, Tenant ID, Secret)
4. **Notificar a CROSSLOG** para iniciar desarrollo
5. **Testing conjunto** con Josefina
6. **Go Live** 🚀

---

**Fecha de creación**: 21 de Octubre 2025
**Versión**: 1.0
**Estado**: Pendiente de aprobación Ecolab

---

## 💡 Notas Importantes

⚠️ **El Client Secret solo se muestra UNA VEZ** al crearlo. Si se pierde, hay que generar uno nuevo.

⚠️ **Admin Consent es obligatorio** - Sin esto, la app no funcionará.

⚠️ **Las credenciales NUNCA se comparten por email** - Usar canal seguro (ej. portal interno, videollamada).

✅ **Una vez configurado, funciona automáticamente 24/7** sin intervención.

---

¿Alguna duda técnica? Contactar a CROSSLOG antes de proceder con la configuración.
