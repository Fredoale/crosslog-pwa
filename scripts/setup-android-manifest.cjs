/**
 * CROSSLOG - Setup AndroidManifest.xml para GPS Background
 * Ejecutar DESPUÉS de: npm run android:init
 * Uso: node scripts/setup-android-manifest.js
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(
  __dirname,
  '../android/app/src/main/AndroidManifest.xml'
);

if (!fs.existsSync(manifestPath)) {
  console.error('❌ AndroidManifest.xml no encontrado.');
  console.error('   Primero ejecutá: npm run android:init');
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

// Permisos a agregar (si no están ya)
const permisos = [
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
];

let agregados = 0;
for (const permiso of permisos) {
  const nombrePermiso = permiso.match(/android:name="([^"]+)"/)[1];
  if (!manifest.includes(nombrePermiso)) {
    // Insertar antes del tag <application>
    manifest = manifest.replace(
      '<application',
      `${permiso}\n    <application`
    );
    console.log(`✅ Permiso agregado: ${nombrePermiso}`);
    agregados++;
  } else {
    console.log(`⏭️  Ya existe: ${nombrePermiso}`);
  }
}

// Agregar foreground service type en el service de BackgroundGeolocation
const foregroundServiceType = 'android:foregroundServiceType="location"';
if (!manifest.includes(foregroundServiceType)) {
  // Buscar el service de background geolocation y agregar el tipo
  manifest = manifest.replace(
    /(<service[^>]*BackgroundGeolocationService[^>]*)(>|\/>)/,
    `$1 ${foregroundServiceType}$2`
  );
  console.log('✅ foregroundServiceType="location" configurado en el Service');
}

fs.writeFileSync(manifestPath, manifest, 'utf8');

console.log(`\n✅ AndroidManifest.xml actualizado (${agregados} permisos nuevos)`);
console.log('');
console.log('📱 Próximos pasos:');
console.log('   npm run android:open   → Abrir Android Studio');
console.log('   Build → Generate Signed Bundle/APK → APK');
