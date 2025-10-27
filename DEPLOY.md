# 🚀 CROSSLOG - Guía de Deploy y Producción

## 📋 Resumen del Sistema

CROSSLOG es una PWA (Progressive Web App) completa para gestión de entregas logísticas con:
- ✅ Funcionalidad offline completa
- ✅ Service Worker con caching inteligente
- ✅ Scanner OCR de remitos
- ✅ Captura de fotos y firma digital
- ✅ Sincronización automática
- ✅ Apps nativas Android/iOS con Capacitor

---

## 🌐 Deploy Web (PWA)

### Opción 1: Netlify (Recomendado - Gratis)

1. **Build de producción**:
   ```bash
   npm run build
   ```

2. **Crear cuenta en Netlify**: https://www.netlify.com

3. **Deploy**:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=dist
   ```

4. **O deploy con Git**:
   - Conectar repo de GitHub
   - Build command: `npm run build`
   - Publish directory: `dist`

5. **Variables de entorno en Netlify**:
   - Ve a: Site settings > Environment variables
   - Agrega todas las variables del `.env`:
     - `VITE_GOOGLE_SHEETS_API_KEY`
     - `VITE_GOOGLE_SPREADSHEET_ID`
     - `VITE_GOOGLE_DRIVE_FOLDER_ID`
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_N8N_WEBHOOK_URL`

6. **Actualizar Google OAuth**:
   - Ve a Google Cloud Console > Credentials
   - Agrega tu dominio de Netlify (ej: `https://crosslog.netlify.app`) a "Orígenes de JavaScript autorizados"

### Opción 2: Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Configuración similar a Netlify.

### Opción 3: Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Selecciona 'dist' como public directory
npm run build
firebase deploy
```

---

## 📱 Deploy Mobile (Android)

### Requisitos Previos
- Android Studio instalado
- Java JDK 11 o superior
- Android SDK (API 33+)

### Pasos:

1. **Build web optimizado**:
   ```bash
   npm run build
   ```

2. **Sincronizar con Capacitor**:
   ```bash
   npx cap sync android
   ```

3. **Abrir en Android Studio**:
   ```bash
   npx cap open android
   ```

4. **Configurar firma de la app** (para release):
   - En Android Studio: Build > Generate Signed Bundle / APK
   - Crear nuevo keystore o usar existente
   - Guardar credenciales de forma segura

5. **Build de producción**:
   - En Android Studio: Build > Build Bundle(s) / APK(s) > Build Bundle(s)
   - O por terminal:
     ```bash
     cd android
     ./gradlew bundleRelease
     ```

6. **Subir a Google Play Console**:
   - Ir a: https://play.google.com/console
   - Crear nueva app
   - Subir el AAB generado en `android/app/build/outputs/bundle/release/`

### Permisos necesarios (ya configurados en `AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 🍎 Deploy Mobile (iOS)

### Requisitos Previos
- macOS con Xcode 14+
- Apple Developer Account ($99/año)
- CocoaPods instalado

### Pasos:

1. **Build web optimizado**:
   ```bash
   npm run build
   ```

2. **Sincronizar con Capacitor**:
   ```bash
   npx cap sync ios
   ```

3. **Instalar pods**:
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```

4. **Abrir en Xcode**:
   ```bash
   npx cap open ios
   ```

5. **Configurar firma**:
   - En Xcode: Target > Signing & Capabilities
   - Seleccionar Team (Apple Developer Account)
   - Cambiar Bundle Identifier si es necesario

6. **Build de producción**:
   - Product > Archive
   - Distribuir a App Store Connect

7. **Subir a App Store**:
   - Ir a: https://appstoreconnect.apple.com
   - Crear nueva app
   - Subir el archivo generado

---

## ⚙️ Configuración Post-Deploy

### 1. Verificar Service Worker

Abre la consola del navegador (F12) y verifica:
```
[PWA] Service Worker registered
[PWA] App ready to work offline
```

### 2. Test de Instalación PWA

En navegadores compatibles (Chrome, Edge, Safari):
- Busca el botón "Instalar app" en la barra de direcciones
- O ve a: Menú > Instalar CROSSLOG

### 3. Test de Funcionalidad Offline

1. Abre la app y haz login
2. Abre DevTools > Application > Service Workers
3. Marca "Offline"
4. Verifica que la app sigue funcionando
5. Captura una foto y completa una entrega
6. Desactiva "Offline" y verifica que se sincroniza

### 4. Monitoreo

- **Google Analytics** (opcional): Agregar en `index.html`
- **Sentry** (opcional): Para tracking de errores
- **Logs de N8N**: Verificar que los webhooks llegan correctamente

---

## 🔧 Mantenimiento

### Actualizar la App

1. **PWA Web**:
   - Hacer cambios en el código
   - `npm run build && netlify deploy --prod`
   - Service Worker actualiza automáticamente en los usuarios

2. **Mobile**:
   - Hacer cambios
   - Incrementar version en `package.json` y `capacitor.config.ts`
   - Build y publicar nueva versión
   - Los usuarios recibirán notificación de actualización

### Limpieza de Caché

Si hay problemas, usuarios pueden limpiar:
- **PWA**: Settings > Clear browsing data > Cached images and files
- **Android**: Settings > Apps > CROSSLOG > Storage > Clear cache
- **iOS**: Settings > General > iPhone Storage > CROSSLOG > Delete app

---

## 📊 Métricas de Performance

### Lighthouse Score Esperado
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+
- PWA: 100

### Verificar con:
```bash
npm install -g lighthouse
lighthouse https://tu-dominio.com --view
```

---

## 🔐 Seguridad

### Variables de Entorno en Producción
- ✅ Nunca commitear `.env` al repo
- ✅ Usar variables de entorno del hosting
- ✅ Rotar Client ID de Google si se compromete
- ✅ Configurar CORS en N8N webhook
- ✅ Habilitar HTTPS (automático en Netlify/Vercel)

### Actualización de Credenciales
Si necesitas cambiar credenciales:
1. Actualizar en Google Cloud Console
2. Actualizar variables en hosting
3. Re-deploy app web
4. Para mobile: nueva versión en stores

---

## 📞 Soporte

### Logs y Debugging

**Web (PWA)**:
- Console del navegador (F12)
- Application > Service Workers
- Application > Cache Storage
- Application > IndexedDB

**Android**:
```bash
adb logcat | grep Capacitor
```

**iOS**:
- Xcode > Window > Devices and Simulators > Console

### Common Issues

**1. Service Worker no se actualiza**
```javascript
// Forzar actualización
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})
location.reload()
```

**2. OAuth redirect error**
- Verificar dominios en Google Cloud Console
- Verificar HTTPS habilitado
- Verificar Client ID en variables de entorno

**3. PDFs no suben a Drive**
- Verificar permisos de carpeta en Google Drive
- Verificar token de OAuth no expirado
- Check console para errores de CORS

---

## 🎯 Checklist Pre-Lanzamiento

### Web (PWA)
- [ ] Build de producción exitoso
- [ ] Service Worker registrado
- [ ] Manifest.json válido
- [ ] Iconos generados (192x192, 512x512)
- [ ] Variables de entorno configuradas
- [ ] Google OAuth origins actualizados
- [ ] Test de instalación PWA
- [ ] Test de funcionalidad offline
- [ ] Test de sincronización
- [ ] Lighthouse score > 90

### Android
- [ ] Build release exitoso
- [ ] App firmada con keystore
- [ ] Permisos configurados correctamente
- [ ] Test en dispositivo físico
- [ ] Screenshots para Play Store
- [ ] Política de privacidad publicada
- [ ] Cuenta de Google Play Console activa

### iOS
- [ ] Build archive exitoso
- [ ] Certificados de firma configurados
- [ ] Test en dispositivo físico
- [ ] Screenshots para App Store
- [ ] Política de privacidad publicada
- [ ] Apple Developer Account activa

---

## 📚 Recursos Adicionales

- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Workbox Docs](https://developers.google.com/web/tools/workbox)
- [Netlify Docs](https://docs.netlify.com/)
- [Google Play Console](https://support.google.com/googleplay/android-developer)
- [App Store Connect](https://developer.apple.com/app-store-connect/)

---

## 🎉 ¡Listo para Producción!

Tu app CROSSLOG ahora está lista para ser desplegada y usada en producción.

**Próximos pasos sugeridos**:
1. Deploy a Netlify/Vercel
2. Test exhaustivo en producción
3. Publicar en Google Play y App Store
4. Monitorear uso y feedback de usuarios
5. Iterar y mejorar

¡Éxito con tu lanzamiento! 🚀
