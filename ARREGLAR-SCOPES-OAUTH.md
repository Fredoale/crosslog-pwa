# 🔧 Arreglar Scopes de OAuth - Eliminar Verificación

**Fecha:** 09/11/2025
**Problema:** Google pide verificación por scopes sensibles innecesarios
**Solución:** Eliminar todos los scopes excepto `drive.file`

---

## ❌ Problema Detectado

Google te pide verificación porque tienes configurados estos scopes:

```
❌ .../auth/drive                    (Acceso TOTAL - Sensible)
❌ .../auth/drive.readonly            (Leer TODO - Sensible)
❌ .../auth/docs                      (Docs - Sensible)
❌ .../auth/drive.meet.readonly       (Meet - Sensible)
❌ .../auth/drive.metadata            (Metadata - Sensible)
❌ .../auth/drive.photos.readonly     (Photos - Sensible)
❌ .../auth/drive.apps.readonly       (Apps - Sensible)

✅ .../auth/drive.file                (ESTE es el único que necesitas)
```

**Tu código solo usa:**
```javascript
scope: 'https://www.googleapis.com/auth/drive.file'
```

**Los demás scopes están configurados pero NO se usan.**

---

## ✅ SOLUCIÓN: Eliminar Scopes Innecesarios

### **Paso 1: Ir a OAuth Consent Screen**

```
https://console.cloud.google.com/apis/credentials/consent
```

### **Paso 2: Click en "EDIT APP"**

Verás un botón en la parte superior:

```
[EDIT APP]  ← Click aquí
```

### **Paso 3: Navegar a "Scopes"**

Avanza por los tabs hasta llegar a:

```
1. OAuth consent screen
2. Scopes  ← Ir aquí
3. Test users
4. Summary
```

O busca en la página actual:

```
Scopes for Google APIs
Scopes currently enabled

[EDIT]  ← Click aquí
```

### **Paso 4: Ver Scopes Actuales**

Verás una lista como esta:

```
Selected scopes:

☑ .../auth/drive
☑ .../auth/drive.file
☑ .../auth/drive.readonly
☑ .../auth/docs
☑ .../auth/drive.meet.readonly
... etc
```

### **Paso 5: DESELECCIONAR TODO excepto uno**

**Deja SOLO este marcado:**

```
☑ .../auth/drive.file
  Ver, editar, crear y borrar solo los archivos específicos
  de Google Drive que usas con esta app
```

**DESMARCA todos los demás:**

```
☐ .../auth/drive
☐ .../auth/drive.readonly
☐ .../auth/docs
☐ .../auth/drive.meet.readonly
☐ .../auth/drive.metadata
☐ .../auth/drive.metadata.readonly
☐ .../auth/drive.photos.readonly
☐ .../auth/drive.apps.readonly
☐ .../auth/drive.appdata
```

### **Paso 6: Guardar**

```
[UPDATE]
```

Luego:

```
[SAVE AND CONTINUE]
```

### **Paso 7: Volver a Resumen**

Avanza hasta el final:

```
[SAVE AND CONTINUE]
[SAVE AND CONTINUE]
[BACK TO DASHBOARD]
```

### **Paso 8: Publicar la App**

Ahora verás:

```
Publishing status: Testing

[PUBLISH APP]  ← Click aquí
```

**Ya NO pedirá verificación** porque solo usas un scope restringido.

---

## 🎯 ¿Por Qué Solo `drive.file`?

### **Scope: `drive.file` (Restringido - No Sensible)**

```
https://www.googleapis.com/auth/drive.file
```

**Permite:**
- ✅ Crear archivos (PDFs)
- ✅ Leer archivos que la app creó
- ✅ Editar archivos que la app creó
- ✅ Borrar archivos que la app creó

**NO permite:**
- ❌ Ver archivos existentes del usuario
- ❌ Acceder a Google Photos
- ❌ Acceder a Google Docs
- ❌ Leer Drive completo

**Por eso es "restringido" (no sensible) y NO requiere verificación.**

---

## 📊 Comparación: Scopes Sensibles vs Restringidos

### **Scopes SENSIBLES (Requieren Verificación)** ❌

```
.../auth/drive                  # Acceso TOTAL a Drive
.../auth/drive.readonly         # Leer TODO Drive
.../auth/docs                   # Acceder a Docs
.../auth/gmail.send             # Enviar emails
.../auth/calendar               # Acceder a Calendar
```

**Características:**
- ❌ Requieren verificación de Google
- ❌ Proceso largo (semanas)
- ❌ Video de demostración
- ❌ Justificación detallada
- ❌ Revisión manual de Google

---

### **Scopes RESTRINGIDOS (NO Requieren Verificación)** ✅

```
.../auth/drive.file             # Solo archivos de la app
.../auth/drive.appdata          # Solo datos de configuración
```

**Características:**
- ✅ NO requieren verificación
- ✅ Publicación inmediata
- ✅ Sin revisión manual
- ✅ Sin videos ni justificaciones

---

## 🔍 Cómo Verificar que Quedó Solo Uno

Después de guardar, ve a:

```
OAuth consent screen → Scopes
```

Deberías ver:

```
Scopes for Google APIs

Selected scopes: 1

.../auth/drive.file
Ver, editar, crear y borrar solo los archivos específicos
de Google Drive que usas con esta app
```

**Si dice "Selected scopes: 1" → ✅ Correcto**

**Si dice "Selected scopes: 7" → ❌ Todavía hay scopes de más**

---

## ⚠️ Importante: Usuarios Existentes

### **¿Qué pasa con los usuarios que ya autorizaron?**

Si algún usuario ya autorizó tu app con los scopes anteriores:

1. **Su token sigue funcionando** (por ahora)
2. **La próxima vez que inicien sesión:**
   - Google les pedirá autorizar de nuevo
   - Solo verán el nuevo scope (`drive.file`)
   - Es menos permisos, así que Google no pedirá confirmación extra

**No hay problema** - es un cambio seguro.

---

## 🐛 Troubleshooting

### **Problema: No encuentro donde editar los scopes**

**Solución:**

1. Ve a: https://console.cloud.google.com/apis/credentials/consent
2. Asegúrate de estar en el proyecto correcto (primeval-falcon-461210-g1)
3. Busca el botón "EDIT APP" en la parte superior
4. Navega por los tabs hasta "Scopes"

---

### **Problema: No puedo deseleccionar algunos scopes**

**Causa:** Algunos scopes pueden estar "requeridos" por librerías

**Solución:**
- Asegúrate de deseleccionar desde la pantalla de scopes
- Si no te deja, puede ser que necesites ir a:
  ```
  APIs & Services → Enabled APIs
  ```
  Y verificar que no haya APIs habilitadas que requieran esos scopes

---

### **Problema: Después de guardar, sigue pidiendo verificación**

**Causa:** Todavía tienes scopes sensibles

**Solución:**
1. Vuelve a editar
2. Cuenta cuántos scopes tienes seleccionados
3. Debe ser **SOLO 1**: `drive.file`
4. Elimina TODOS los demás

---

## 📋 Checklist de Verificación

Antes de publicar, verifica:

- [ ] Solo 1 scope seleccionado
- [ ] Ese scope es: `.../auth/drive.file`
- [ ] NO hay scopes como `drive` o `drive.readonly`
- [ ] NO hay scopes de `docs`, `photos`, `meet`
- [ ] Guardaste los cambios
- [ ] Volviste al dashboard

Cuando estén todos ✅, puedes hacer click en **[PUBLISH APP]**.

---

## 🎯 Después de Publicar

Verificarás que funcionó cuando:

1. ✅ **Publishing status: In production**
2. ✅ **NO pide verificación**
3. ✅ **Cualquiera puede usar la app**
4. ✅ **Solo ven el permiso de `drive.file` al autorizar**

---

## 📝 Texto del Permiso que Verán los Usuarios

Cuando alguien autorice tu app, verá:

```
┌─────────────────────────────────────────┐
│  Iniciar sesión con Google              │
│                                         │
│  CROSSLOG - Sistema de Entregas quiere │
│  acceder a tu cuenta de Google          │
│                                         │
│  Esto permitirá a CROSSLOG:             │
│                                         │
│  ✓ Ver, editar, crear y borrar solo    │
│    los archivos específicos de Google   │
│    Drive que usas con esta app          │
│                                         │
│  [Cancelar]  [Permitir]                 │
└─────────────────────────────────────────┘
```

**Nota el texto:** "solo los archivos específicos"

**NO dirá:** "Ver y editar TODOS tus archivos" ← Esto asustaría

---

## 💡 Por Qué Esto Pasó

Probablemente cuando configuraste OAuth:

1. Google te mostró una lista de scopes disponibles
2. Seleccionaste varios "por si acaso"
3. Tu código solo usa 1, pero quedaron configurados los demás
4. Google detecta los scopes sensibles y pide verificación

**Es común** - muchos desarrolladores hacen esto al principio.

**La solución es simple:** Eliminar los que no usas.

---

## 🚀 Resumen de Pasos Rápidos

```
1. OAuth Consent Screen
   ↓
2. [EDIT APP]
   ↓
3. Tab "Scopes"
   ↓
4. Deseleccionar TODO excepto "drive.file"
   ↓
5. [SAVE AND CONTINUE]
   ↓
6. [BACK TO DASHBOARD]
   ↓
7. [PUBLISH APP]
   ↓
8. ✅ Publicado sin verificación
```

**Tiempo estimado:** 5 minutos

---

## 🔗 Referencias

- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent
- **Documentación Scopes:** https://developers.google.com/identity/protocols/oauth2/scopes#drive
- **Scope `drive.file`:** https://developers.google.com/identity/protocols/oauth2/scopes#drive.file

---

**¡No envíes para verificación! Solo elimina los scopes innecesarios y publica directamente.** ✅
