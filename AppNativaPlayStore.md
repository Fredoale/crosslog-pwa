# App Nativa Crosslog - Play Store

## Resumen

Crear una app nativa para Android permite tracking GPS en segundo plano (background), algo que las PWA no pueden hacer de forma confiable.

---

## ¿Qué se necesita?

### 1. Tecnología (elegir una)

| Opción | Lenguaje | Ventaja | Desventaja |
|--------|----------|---------|------------|
| **React Native** | JavaScript/TypeScript | Ya conoces React, código compartido | Requiere aprender React Native |
| **Flutter** | Dart | Muy rápido, buen rendimiento | Nuevo lenguaje |
| **Kotlin (nativo)** | Kotlin | Mejor rendimiento, acceso total | Solo Android, más complejo |
| **Capacitor** | JavaScript | Convierte tu PWA actual | Limitaciones en background |

**Recomendación:** React Native o Capacitor (más fácil si ya tienes la PWA)

---

### 2. Cuenta de desarrollador Google Play

| Item | Costo | Frecuencia |
|------|-------|------------|
| Registro en Google Play Console | $25 USD | Único (una vez) |
| Cuenta de desarrollador | Incluido | Permanente |

**Link:** https://play.google.com/console/signup

---

### 3. Requisitos para publicar

```
1. Cuenta Google Play Console ($25 USD)
2. App firmada con keystore
3. Íconos y capturas de pantalla
4. Política de privacidad (URL pública)
5. Descripción de la app
6. Clasificación de contenido
7. Cumplir políticas de Google
```

---

### 4. Permisos especiales para GPS en background

Para que Android permita tracking en segundo plano:

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

**Importante:** Google revisa apps con `ACCESS_BACKGROUND_LOCATION`. Debes justificar por qué la necesitas (tracking de flota es válido).

---

### 5. Tiempo estimado de desarrollo

| Fase | Tiempo estimado |
|------|-----------------|
| Configuración inicial | 1-2 días |
| Migrar funcionalidad básica | 1-2 semanas |
| Implementar GPS background | 3-5 días |
| Testing | 1 semana |
| Publicación y aprobación | 3-7 días |
| **Total** | **3-5 semanas** |

---

### 6. Opción rápida: Capacitor

Capacitor puede convertir tu PWA actual en app nativa:

```bash
# Instalar Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# Agregar Android
npm install @capacitor/android
npx cap add android

# Plugin de geolocalización background
npm install @capacitor/geolocation
npm install @capacitor-community/background-geolocation

# Compilar
npm run build
npx cap sync
npx cap open android
```

**Ventaja:** Reutiliza 90% del código actual
**Desventaja:** Puede tener limitaciones vs app nativa pura

---

### 7. Estructura de costos

| Concepto | Costo |
|----------|-------|
| Google Play Console | $25 USD (único) |
| Servidor/Firebase | Ya lo tienes |
| Google Maps API | ~$0-200/mes (crédito gratis) |
| Desarrollo (si contratas) | $500-2000 USD |
| **Total inicial** | ~$25 USD si lo haces tú |

---

### 8. Pasos para publicar en Play Store

```
1. Crear cuenta en Google Play Console
   → play.google.com/console

2. Crear nueva aplicación
   → Nombre: Crosslog
   → Idioma: Español

3. Configurar ficha de Play Store
   → Descripción corta y larga
   → Íconos (512x512)
   → Capturas de pantalla
   → Categoría: Negocios / Logística

4. Política de privacidad
   → Crear página web con política
   → Explicar uso de ubicación

5. Clasificación de contenido
   → Completar cuestionario
   → Generalmente: Para todos

6. Subir APK/AAB
   → Generar archivo firmado
   → Subir a "Producción" o "Prueba interna"

7. Revisión de Google
   → 1-7 días
   → Pueden pedir justificación de permisos

8. Publicación
   → Automática al aprobar
   → Disponible en Play Store
```

---

### 9. Justificación para permiso de ubicación en background

Google requiere explicar por qué necesitas ubicación en segundo plano:

```
"Crosslog es una aplicación de gestión de flotas para empresas
de logística. El tracking GPS en segundo plano es esencial para:

1. Seguridad del conductor durante las rutas de entrega
2. Monitoreo en tiempo real de la flota por supervisores
3. Optimización de rutas y tiempos de entrega
4. Registro de recorridos para facturación y auditoría

La ubicación solo se recopila durante horario laboral cuando
el conductor inicia su jornada. El conductor tiene control
total y puede desactivar el tracking en cualquier momento."
```

---

### 10. Alternativa: Solo para choferes

Si prefieres no publicar en Play Store:

```
1. Generar APK firmado
2. Distribuir directamente a choferes
3. Ellos instalan manualmente (permitir "orígenes desconocidos")

Ventaja: Sin revisión de Google, más rápido
Desventaja: Instalación manual, sin actualizaciones automáticas
```

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se puede hacer? | Sí |
| ¿Costo inicial? | $25 USD |
| ¿Tiempo? | 3-5 semanas |
| ¿Difícil? | Moderado (Capacitor facilita) |
| ¿Vale la pena? | Sí, si necesitas tracking 100% confiable |

---

## Próximo paso cuando quieras hacerlo

1. Crear cuenta Google Play Console ($25)
2. Decidir: Capacitor vs React Native
3. Implementar GPS background
4. Publicar

---

*Documento creado: Enero 2025*
*Para: Crosslog PWA - Futuro desarrollo*
