# CROSSLOG - IDs y Referencias

## 📊 Google Sheets

### Sistema de Entregas (Principal)
- **ID del Spreadsheet:** `1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI`
- **URL:** https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI

#### Hojas (Tabs) en Sistema de Entregas:
1. **Sistema_Entregas** (gid: 129279590)
   - Contiene: Entregas activas, HDRs, estados
   - URL: https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=129279590

2. **Accesos_Clientes** (gid: 1931001347)
   - Contiene: Códigos de acceso para clientes (ej: ECO2025)
   - URL: https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=1931001347

3. **Accesos_Fleteros** (gid: 549188602)
   - Contiene: Códigos de acceso para fleteros (ej: BARCO2025)
   - URL: https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=549188602

4. **Maestra_Clientes** (gid: 1690074791)
   - Contiene: Datos de clientes (nombres, direcciones, teléfonos)
   - URL: https://docs.google.com/spreadsheets/d/1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI/edit?gid=1690074791

### Base (Histórico)
- **ID del Spreadsheet:** `13CHwMa9nnePPloubawOwdmH25-VKJCu2rcjo36LHWFw`
- **URL:** https://docs.google.com/spreadsheets/d/13CHwMa9nnePPloubawOwdmH25-VKJCu2rcjo36LHWFw
- **Hoja Principal:** BASE (gid: 825554136)
- **Uso:** Archivo histórico de todas las entregas completadas

---

## 📁 Google Drive - Carpetas de Remitos

### Carpetas por Cliente

1. **ECOLAB**
   - **Folder ID:** `1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ`
   - **URL:** https://drive.google.com/drive/folders/1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ
   - **Código Cliente:** ECO

2. **TOYOTA**
   - **Folder ID:** `1XE_cz8tyktyINm8o0ZwW4zcGEmR5zuxT`
   - **URL:** https://drive.google.com/drive/folders/1XE_cz8tyktyINm8o0ZwW4zcGEmR5zuxT
   - **Código Cliente:** TOY

3. **APN**
   - **Folder ID:** `1L_ib8P1MV2hP5SZyn44VuFJ6u57mTfqC`
   - **URL:** https://drive.google.com/drive/folders/1L_ib8P1MV2hP5SZyn44VuFJ6u57mTfqC
   - **Código Cliente:** APN

4. **INQUIMEX**
   - **Folder ID:** `1NhcBSDrmZI6f8COxVcZwBXpv7O1DZkm5`
   - **URL:** https://drive.google.com/drive/folders/1NhcBSDrmZI6f8COxVcZwBXpv7O1DZkm5
   - **Código Cliente:** INQ

5. **ACONCAGUA**
   - **Folder ID:** `1G2z0CWsQ-utWq70ETuYIP8WtzK-h01PB`
   - **URL:** https://drive.google.com/drive/folders/1G2z0CWsQ-utWq70ETuYIP8WtzK-h01PB
   - **Código Cliente:** ACO

6. **HALLIBURTON**
   - **Folder ID:** `1b8w1oEf9DdRpUbb-8tiX7FNB8Skr10xI`
   - **URL:** https://drive.google.com/drive/folders/1b8w1oEf9DdRpUbb-8tiX7FNB8Skr10xI
   - **Código Cliente:** HALL / HAL

---

## 🔑 Variables de Entorno (.env)

```env
# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD8UoubNuqWazSLcjh4bSq36EbFaXcvDB4
VITE_GOOGLE_SPREADSHEET_BASE_ID=13CHwMa9nnePPloubawOwdmH25-VKJCu2rcjo36LHWFw
VITE_GOOGLE_SPREADSHEET_ENTREGAS_ID=1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI

# Google Drive API (OAuth 2.0)
VITE_GOOGLE_DRIVE_CLIENT_ID=[TU_CLIENT_ID_OAUTH]

# Default folder for PDFs (Ecolab)
VITE_GOOGLE_DRIVE_FOLDER_ID=1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ
```

---

## 📱 Netlify

- **URL de Producción:** https://appcrosslog.netlify.app
- **Repositorio GitHub:** https://github.com/Fredoale/crosslog-pwa

---

## 🔐 Google Cloud Project

- **Project ID:** primeval-falcon-461210-g1
- **Project Number:** 523970559904
- **APIs Habilitadas:**
  - Google Sheets API v4
  - Google Drive API v3
  - Google Identity Services (OAuth 2.0)

---

## 📋 Mapeo Código → Carpeta

| Código Cliente | Nombre | Folder ID | Carpeta Drive |
|----------------|--------|-----------|---------------|
| ECO | ECOLAB | `1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ` | REMITOS ECOLAB |
| TOY | TOYOTA | `1XE_cz8tyktyINm8o0ZwW4zcGEmR5zuxT` | REMITOS TOYOTA |
| APN | APN | `1L_ib8P1MV2hP5SZyn44VuFJ6u57mTfqC` | REMITOS APN |
| INQ | INQUIMEX | `1NhcBSDrmZI6f8COxVcZwBXpv7O1DZkm5` | REMITOS INQUIMEX |
| ACO | ACONCAGUA | `1G2z0CWsQ-utWq70ETuYIP8WtzK-h01PB` | REMITOS ACONCAGUA |
| HALL/HAL | HALLIBURTON | `1b8w1oEf9DdRpUbb-8tiX7FNB8Skr10xI` | REMITOS HALLIBURTON |

---

## 📞 Contacto

- **WhatsApp Soporte:** +54 11 7360-3954
- **Email Google Cloud:** (el usado para el proyecto)

---

**Última actualización:** 14 de noviembre de 2024
