# 📦 PLAN DE DEPLOY INCREMENTAL - CROSSLOG PWA

**Fecha:** 9 de Diciembre 2025
**Versión actual en producción:** 2.0.0 (14 Nov 2025)
**Versión en desarrollo:** 3.1 (con Firestore + Gestión Documentos)
**Estrategia:** Deploy por funcionalidades con feature flags

---

## 🎯 OBJETIVO

Deployar las nuevas funcionalidades de forma **segura, incremental y sin romper producción**, usando feature flags para habilitar/deshabilitar módulos según estén listos.

---

## 🚦 ESTRATEGIA: FEATURE FLAGS

Usaremos variables de entorno para controlar qué funcionalidades están activas en producción.

### Variables de Entorno a Agregar

```env
# Feature Flags
VITE_FEATURE_MARKETPLACE_FIRESTORE=false    # Marketplace con Firebase
VITE_FEATURE_GESTION_DOCUMENTOS=true        # Gestión de documentos
VITE_FEATURE_DASHBOARD_DOCS=true            # Dashboard de documentos
```

**Importante:**
- `false` = Módulo deshabilitado (muestra mensaje "En desarrollo")
- `true` = Módulo habilitado (funcional)

---

## 📋 PLAN DE DEPLOYS - 4 FASES

### 🔷 FASE 1: PREPARACIÓN (Deploy 1)
**Objetivo:** Preparar el código con feature flags sin romper nada
**Duración:** 1 hora
**Riesgo:** ⚠️ BAJO

#### Cambios a realizar:

**1.1 Crear archivo de configuración de features**
```typescript
// src/config/features.ts
export const FEATURES = {
  MARKETPLACE_FIRESTORE: import.meta.env.VITE_FEATURE_MARKETPLACE_FIRESTORE === 'true',
  GESTION_DOCUMENTOS: import.meta.env.VITE_FEATURE_GESTION_DOCUMENTOS === 'true',
  DASHBOARD_DOCS: import.meta.env.VITE_FEATURE_DASHBOARD_DOCS === 'true',
} as const;

export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature] || false;
};
```

**1.2 Modificar ConsultaInterna.tsx - Ocultar Marketplace**

Cambiar el botón del Marketplace (línea 338-354):

```tsx
{/* Marketplace - Mostrar como "En desarrollo" si flag está disabled */}
<button
  onClick={() => {
    if (isFeatureEnabled('MARKETPLACE_FIRESTORE')) {
      setViewMode('marketplace');
    }
  }}
  className={`bg-white rounded-2xl shadow-xl p-8 border-2 ${
    isFeatureEnabled('MARKETPLACE_FIRESTORE')
      ? 'border-transparent hover:border-[#a8e063] cursor-pointer'
      : 'border-gray-300 cursor-not-allowed opacity-60'
  } transition-all hover:shadow-2xl animate-scale-in group relative`}
  disabled={!isFeatureEnabled('MARKETPLACE_FIRESTORE')}
>
  <div className="flex flex-col items-center text-center gap-4">
    <div className={`w-20 h-20 bg-gradient-to-br ${
      isFeatureEnabled('MARKETPLACE_FIRESTORE')
        ? 'from-orange-500 to-orange-600'
        : 'from-gray-400 to-gray-500'
    } rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
    <h2 className="text-2xl font-bold text-gray-800">
      Marketplace de Viajes
    </h2>
    <p className="text-gray-600">
      {isFeatureEnabled('MARKETPLACE_FIRESTORE')
        ? 'Gestiona viajes y ofertas en tiempo real'
        : 'Publicación y gestión de viajes disponibles'
      }
    </p>

    {/* Badge "En Desarrollo" */}
    {!isFeatureEnabled('MARKETPLACE_FIRESTORE') && (
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
          🚧 EN DESARROLLO
        </span>
      </div>
    )}
  </div>
</button>
```

**1.3 Modificar renderizado del Marketplace (línea 472-474)**

```tsx
{viewMode === 'marketplace' ? (
  /* Marketplace Section */
  isFeatureEnabled('MARKETPLACE_FIRESTORE') ? (
    <MarketplaceSection />
  ) : (
    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="w-32 h-32 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          🚧 Módulo en Desarrollo
        </h2>
        <p className="text-xl text-gray-600 mb-6">
          El <strong>Marketplace de Viajes con Firebase</strong> está siendo optimizado para ofrecerte:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Actualizaciones en <strong>tiempo real</strong> (&lt;1 segundo)</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Reducción del <strong>99% en costos</strong> de API</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Notificaciones <strong>push automáticas</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">Base de datos <strong>Firebase Firestore</strong></span>
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            📅 <strong>Próximo lanzamiento:</strong> Diciembre 2025
          </p>
        </div>
      </div>
    </div>
  )
) : viewMode === 'indicadores' ? (
  /* ... resto del código ... */
```

**1.4 Variables de entorno en Netlify**

```env
VITE_FEATURE_MARKETPLACE_FIRESTORE=false
VITE_FEATURE_GESTION_DOCUMENTOS=true
VITE_FEATURE_DASHBOARD_DOCS=true
```

#### Resultado Fase 1:
✅ Marketplace aparece opaco con badge "EN DESARROLLO"
✅ Al hacer clic muestra mensaje profesional explicando las mejoras
✅ Resto del sistema funciona EXACTAMENTE igual
✅ No se rompe nada

---

### 🔷 FASE 2: GESTIÓN DE DOCUMENTOS (Deploy 2)
**Objetivo:** Activar módulo de Gestión de Documentos completo
**Duración:** 2 horas
**Riesgo:** ⚠️ BAJO

#### Pre-requisitos:
1. ✅ Google Apps Script actualizado con funciones `updateChoferDocumento` y `updateUnidadDocumento`
2. ✅ Verificar que todas las hojas existen: `Choferes_Documentos`, `Unidades_Documentos`, `Cuadernillos_Crosslog`

#### Archivos a deployar:
```
src/components/admin/
  ├── DashboardDocumentos.tsx          ← NUEVO
  ├── DetalleChoferDocumentos.tsx      ← MODIFICADO (modal edición)
  ├── DetalleUnidadDocumentos.tsx      ← MODIFICADO (modal edición)
  └── GestionDocumentosPage.tsx        ← MODIFICADO (dashboard + nuevos tipos)

src/utils/
  └── sheetsApi.ts                     ← MODIFICADO (3 funciones nuevas)

GOOGLE_APPS_SCRIPT_SETUP.md           ← DOCUMENTACIÓN
```

#### Pasos:

**2.1 Re-deployar Google Apps Script**
```
1. Abrir Google Sheets
2. Extensions → Apps Script
3. Copiar funciones de GOOGLE_APPS_SCRIPT_SETUP.md:
   - updateChoferDocumento
   - updateUnidadDocumento
   - Casos en doPost
4. Deploy → New deployment
5. Copiar nueva URL del web app
6. Actualizar VITE_APPS_SCRIPT_URL en Netlify (si cambió)
```

**2.2 Commit y Push**
```bash
git add .
git commit -m "feat: Add complete document management system with dashboard

- Add DashboardDocumentos.tsx with alerts consolidation
- Add click-to-edit modal for documents
- Add new vehicle types: Tractor, Acoplado
- Add SVO (Seguro de Vida Obligatorio) document type
- Update Google Apps Script with update functions
- Add fetchCuadernillos alias function"

git push origin main
```

**2.3 Netlify auto-deploya**
- Esperar 3-5 minutos
- Verificar build exitoso en dashboard

**2.4 Verificar en producción**
```
1. Ir a https://crosslog-pwa.netlify.app/#/consulta-interna
2. Login con credenciales internas
3. Ir a Recursos → Gestión de Documentación
4. Verificar:
   ✓ Dashboard carga correctamente
   ✓ Stats se muestran (Total, Críticos, Altos, Medios, Vigentes)
   ✓ Alertas se cargan
   ✓ Click en documento abre modal de edición
   ✓ Guardar cambios funciona
```

#### Resultado Fase 2:
✅ Gestión de Documentos 100% funcional
✅ Dashboard profesional operativo
✅ Edición de documentos activa
✅ Nuevos tipos disponibles (Tractor, Acoplado, SVO)

---

### 🔷 FASE 3: FIREBASE FIRESTORE SETUP (Deploy 3)
**Objetivo:** Preparar infraestructura Firebase sin activarla
**Duración:** 1 hora
**Riesgo:** ⚠️ BAJO (solo archivos nuevos, no se usan aún)

#### Archivos a deployar:
```
src/config/
  └── firebase.ts                      ← NUEVO (configuración)

src/utils/
  └── marketplaceApiFirestore.ts       ← NUEVO (funciones Firestore)
```

#### Pasos:

**3.1 Verificar Firebase Project**
```
✓ Proyecto: croog-marketplace
✓ Firestore Database creado
✓ Reglas de seguridad configuradas
✓ Variables de entorno disponibles
```

**3.2 Agregar variables Firebase en Netlify**
```env
VITE_FIREBASE_API_KEY=AIzaSyCCOR8UgE6w3xgr0htvvVWm6QDynC2138s
VITE_FIREBASE_AUTH_DOMAIN=croog-marketplace.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=croog-marketplace
VITE_FIREBASE_STORAGE_BUCKET=croog-marketplace.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=203275697008
VITE_FIREBASE_APP_ID=1:203275697008:web:fd3d995d90b4a0cca7edb5
```

**3.3 Commit archivos Firebase**
```bash
git add src/config/firebase.ts src/utils/marketplaceApiFirestore.ts
git commit -m "feat: Add Firebase Firestore infrastructure (not activated)

- Add firebase.ts configuration
- Add marketplaceApiFirestore.ts with real-time functions
- Infrastructure ready for Phase 4 activation"

git push origin main
```

#### Resultado Fase 3:
✅ Firebase conectado y listo
✅ Funciones Firestore disponibles pero no se usan
✅ Sistema sigue usando Google Sheets
✅ Todo funciona igual que antes

---

### 🔷 FASE 4: ACTIVAR MARKETPLACE FIRESTORE (Deploy 4)
**Objetivo:** Activar Marketplace con Firebase en producción
**Duración:** 2 horas
**Riesgo:** ⚠️⚠️ MEDIO (cambio de backend)

#### Pre-requisitos:
1. ✅ Migrar datos de Google Sheets a Firestore
2. ✅ Probar en staging/local exhaustivamente
3. ✅ Backup de Google Sheets actualizado

#### Pasos:

**4.1 Migrar datos existentes**
```bash
# Ejecutar script de migración (crear si no existe)
node scripts/migrate-sheets-to-firestore.js
```

**4.2 Cambiar feature flag en Netlify**
```env
# ANTES
VITE_FEATURE_MARKETPLACE_FIRESTORE=false

# DESPUÉS
VITE_FEATURE_MARKETPLACE_FIRESTORE=true
```

**4.3 Trigger deploy manual en Netlify**
```
Site → Deploys → Trigger deploy → Deploy site
```

**4.4 Verificar en producción**
```
1. Abrir Consulta Interna
2. Click en Marketplace
3. Verificar:
   ✓ Ya NO muestra "En desarrollo"
   ✓ Carga viajes desde Firestore
   ✓ Tiempo real funciona (<1 seg)
   ✓ Crear viaje guarda en Firestore
   ✓ Fleteros ven cambios instantáneamente
```

**4.5 Monitoreo post-deploy (primeras 24h)**
```
- Firebase Console → Firestore → Usage
- Verificar lecturas/día (~150 vs 144,000 antes)
- Netlify Functions logs
- Reportes de usuarios
```

#### Rollback plan (si algo falla):
```env
# En Netlify, cambiar inmediatamente:
VITE_FEATURE_MARKETPLACE_FIRESTORE=false

# Re-deploy
# Sistema vuelve a Google Sheets en 3 minutos
```

#### Resultado Fase 4:
✅ Marketplace en tiempo real activo
✅ 99% reducción en API calls
✅ Notificaciones instantáneas
✅ Firebase Firestore operativo

---

## 🔄 CRONOGRAMA SUGERIDO

### Opción A: Deploy Conservador (1 semana)
```
Lunes:    Fase 1 - Feature flags
Martes:   Fase 2 - Gestión de Documentos
Miércoles: Monitoreo y ajustes
Jueves:   Fase 3 - Firebase setup
Viernes:  Fase 4 - Activar Marketplace
```

### Opción B: Deploy Rápido (2 días)
```
Día 1 mañana:  Fase 1 - Feature flags
Día 1 tarde:   Fase 2 - Gestión de Documentos
Día 2 mañana:  Fase 3 - Firebase setup
Día 2 tarde:   Fase 4 - Activar Marketplace
```

### Opción C: Deploy Agresivo (1 día)
```
09:00 - Fase 1
11:00 - Fase 2
14:00 - Fase 3
16:00 - Fase 4
18:00 - Monitoreo
```

**Recomendación:** Opción A (conservador) para minimizar riesgos

---

## 🛡️ SEGURIDAD Y ROLLBACK

### Estrategia de Rollback

**Nivel 1: Feature Flag (3 minutos)**
```env
# Deshabilitar feature en Netlify
VITE_FEATURE_[NOMBRE]=false
# Trigger deploy
```

**Nivel 2: Rollback de Deploy (5 minutos)**
```
Netlify → Deploys → [Previous working deploy] → Publish deploy
```

**Nivel 3: Revert Git (10 minutos)**
```bash
git revert HEAD
git push origin main
```

### Checklist Pre-Deploy (CADA FASE)

- [ ] Backup de base de datos
- [ ] Variables de entorno configuradas
- [ ] Build local exitoso (`npm run build`)
- [ ] Tests pasando (si aplica)
- [ ] Changelog actualizado
- [ ] Equipo notificado
- [ ] Plan de rollback revisado

### Checklist Post-Deploy (CADA FASE)

- [ ] Build en Netlify exitoso
- [ ] Sitio accesible (https://crosslog-pwa.netlify.app)
- [ ] Funcionalidades críticas funcionando
- [ ] No hay errores en consola
- [ ] Performance aceptable (Lighthouse > 90)
- [ ] Monitoreo activo primeras 2 horas

---

## 📊 MÉTRICAS DE ÉXITO

### Fase 1 (Feature Flags)
- ✅ Build exitoso
- ✅ Marketplace muestra "En desarrollo"
- ✅ Resto del sistema sin cambios

### Fase 2 (Gestión Documentos)
- ✅ Dashboard carga en < 3 segundos
- ✅ Edición de documentos funciona
- ✅ 0 errores reportados por usuarios

### Fase 3 (Firebase Setup)
- ✅ Firebase conectado
- ✅ No impacto en sistema actual

### Fase 4 (Marketplace Activo)
- ✅ Latencia < 1 segundo
- ✅ Lecturas API reducidas 99%
- ✅ 0 downtime
- ✅ Usuarios satisfechos

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

**AHORA (Hoy):**
1. Revisar y aprobar este plan
2. Decidir cronograma (A, B o C)
3. Preparar Google Apps Script

**Mañana:**
1. Ejecutar Fase 1 (Feature Flags)
2. Monitorear resultados
3. Planificar Fase 2

---

## 📞 CONTACTO Y SOPORTE

**Durante deploys:**
- Mantener consola de Netlify abierta
- Monitorear logs en tiempo real
- Tener plan de rollback a mano

**En caso de problemas:**
1. No entrar en pánico
2. Ejecutar rollback apropiado
3. Documentar el error
4. Analizar en frío
5. Re-intentar con fixes

---

## ✅ CHECKLIST FINAL

Antes de comenzar CUALQUIER deploy:

- [ ] Leí y entendí este plan completo
- [ ] Tengo backup de base de datos
- [ ] Tengo acceso a Netlify
- [ ] Tengo acceso a Google Apps Script
- [ ] Tengo acceso a Firebase Console
- [ ] Variables de entorno documentadas
- [ ] Cronograma elegido
- [ ] Tiempo suficiente para monitorear
- [ ] Plan de rollback impreso/a mano

---

*Última actualización: 9 Diciembre 2025*
*Versión: 1.0*
