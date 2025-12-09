# 🚀 RESUMEN: Deploy Incremental CROSSLOG

**Lectura rápida:** 5 minutos
**Para ver el plan completo:** [PLAN-DEPLOY-INCREMENTAL.md](./PLAN-DEPLOY-INCREMENTAL.md)

---

## 🎯 OBJETIVO

Deployar las mejoras desarrolladas (Firebase Firestore + Gestión Documentos) **SIN romper producción**, usando feature flags.

---

## 📊 QUÉ HAY EN PRODUCCIÓN VS QUÉ TENEMOS LOCAL

| Característica | Producción (v2.0.0) | Local (v3.1) |
|---------------|---------------------|--------------|
| Marketplace | Google Sheets (lento) | Firebase (tiempo real) |
| Gestión Docs | ❌ No existe | ✅ Dashboard + Edición |
| Alertas Vencimiento | ❌ No existe | ✅ Sistema completo |

**Problema:** 25 días sin deployar = brecha creciente

---

## ✅ SOLUCIÓN: 4 DEPLOYS SEGUROS

### 📦 DEPLOY 1: Feature Flags (1 hora)
**Qué hace:** Prepara el código con interruptores ON/OFF

**Archivos nuevos:**
- `src/config/features.ts` ← Controla qué está activo

**Cambios:**
- Marketplace aparece como "🚧 EN DESARROLLO"
- Botón opaco, no clickeable
- Mensaje profesional explicando mejoras

**Variables en Netlify:**
```env
VITE_FEATURE_MARKETPLACE_FIRESTORE=false
VITE_FEATURE_GESTION_DOCUMENTOS=true
VITE_FEATURE_DASHBOARD_DOCS=true
```

**Resultado:**
✅ Marketplace oculto
✅ Resto funciona IGUAL
✅ Riesgo: CERO

---

### 📦 DEPLOY 2: Gestión de Documentos (2 horas)
**Qué hace:** Activa el sistema de documentación completo

**Pre-requisito:**
1. Actualizar Google Apps Script con funciones nuevas

**Archivos:**
- `DashboardDocumentos.tsx` (nuevo)
- `GestionDocumentosPage.tsx` (modificado)
- `sheetsApi.ts` (3 funciones nuevas)

**Resultado:**
✅ Dashboard profesional
✅ Edición de documentos
✅ Alertas de vencimiento
✅ Nuevos tipos: Tractor, Acoplado, SVO

---

### 📦 DEPLOY 3: Firebase Setup (1 hora)
**Qué hace:** Sube archivos de Firebase SIN activarlos

**Archivos:**
- `src/config/firebase.ts` (nuevo)
- `src/utils/marketplaceApiFirestore.ts` (nuevo)

**Variables en Netlify:**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=croog-marketplace
# ... resto de Firebase
```

**Resultado:**
✅ Firebase conectado
✅ Listo para usar
✅ Sistema sigue usando Sheets

---

### 📦 DEPLOY 4: Activar Marketplace (2 horas)
**Qué hace:** Cambia un flag y activa Firebase

**Acción:**
```env
# Cambiar EN NETLIFY
VITE_FEATURE_MARKETPLACE_FIRESTORE=true
```

**Resultado:**
✅ Marketplace tiempo real
✅ Latencia < 1 segundo
✅ 99% menos API calls

**Rollback (si falla):**
```env
VITE_FEATURE_MARKETPLACE_FIRESTORE=false
# Re-deploy → Vuelve a Sheets en 3 minutos
```

---

## 📅 CRONOGRAMAS

### Opción CONSERVADORA (Recomendado)
```
Lunes    → Deploy 1 (Feature flags)
Martes   → Deploy 2 (Gestión Docs)
Jueves   → Deploy 3 (Firebase setup)
Viernes  → Deploy 4 (Activar Marketplace)
```

### Opción RÁPIDA
```
Día 1 AM  → Deploy 1 + 2
Día 2 AM  → Deploy 3
Día 2 PM  → Deploy 4
```

### Opción AGRESIVA
```
Todo en 1 día (riesgoso, no recomendado)
```

---

## 🛡️ SEGURIDAD

### Rollback Rápido (3 minutos)
```env
# En Netlify → Environment variables
VITE_FEATURE_[NOMBRE]=false
# Trigger deploy
```

### Rollback Completo (5 minutos)
```
Netlify → Deploys → [Deploy anterior] → Publish
```

---

## ✅ CHECKLIST RÁPIDO

Antes de CADA deploy:

- [ ] Backup de Google Sheets
- [ ] Variables de entorno listas
- [ ] `npm run build` funciona local
- [ ] Plan de rollback a mano
- [ ] Tiempo para monitorear (2 horas)

Después de CADA deploy:

- [ ] Build exitoso en Netlify
- [ ] Sitio carga sin errores
- [ ] Funcionalidad crítica OK
- [ ] Consola sin errores rojos

---

## 🎯 PRÓXIMOS PASOS

**AHORA:**
1. ✅ Revisar este documento
2. ✅ Elegir cronograma
3. ✅ Preparar Google Apps Script

**DEPLOY 1 (cuando estés listo):**
1. Los archivos YA están creados (`features.ts`, `.env.example`)
2. Hacer commit y push
3. Agregar variables en Netlify
4. Verificar Marketplace aparece "En desarrollo"

**¿Dudas?**
- Plan completo: [PLAN-DEPLOY-INCREMENTAL.md](./PLAN-DEPLOY-INCREMENTAL.md)
- Estado proyecto: [ESTADO_PROYECTO.md](./ESTADO_PROYECTO.md)

---

## 📞 SOPORTE RÁPIDO

**Si algo falla:**
1. NO pánico
2. Ejecutar rollback (cambiar flag a `false`)
3. Documentar error
4. Analizar en frío

**Logs importantes:**
- Netlify: Site → Deploys → [Deploy] → Deploy log
- Firebase: Console → Firestore → Usage
- Browser: F12 → Console

---

## 💡 VENTAJAS DE ESTE ENFOQUE

✅ **Sin riesgos:** Cada deploy es reversible en minutos
✅ **Incremental:** Si algo falla, solo afecta una feature
✅ **Flexible:** Puedes pausar entre deploys
✅ **Profesional:** Feature flags = buena práctica industry standard
✅ **Confiable:** Producción NUNCA se cae

---

*¿Listo para empezar? → [Ver Plan Completo](./PLAN-DEPLOY-INCREMENTAL.md)*
