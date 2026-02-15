# 🔐 REGLAS DE FIRESTORE - CROSSLOG PWA

## Estructura Actual de Colecciones

### 📦 MARKETPLACE (Ya existente)
```
viajes_marketplace/
ofertas_marketplace/
fleteros_perfil/
ratings_marketplace/
```

### 🔧 CHECKLIST DE MANTENIMIENTO (Nuevo)
```
checklists/
ordenes_trabajo/
novedades/
estadisticas_unidades/
```

---

## ⚙️ Configuración de Reglas Firestore

### 🎯 Opción 1: REGLAS SIMPLES (Para desarrollo/testing)

**Firebase Console → Firestore Database → Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==============================
    // MARKETPLACE - Sin cambios
    // ==============================
    match /viajes_marketplace/{viajeId} {
      allow read: if true;
      allow write: if true;
    }

    match /ofertas_marketplace/{ofertaId} {
      allow read: if true;
      allow write: if true;
    }

    match /fleteros_perfil/{fleteroId} {
      allow read: if true;
      allow write: if true;
    }

    match /ratings_marketplace/{ratingId} {
      allow read: if true;
      allow write: if true;
    }

    // ==============================
    // CHECKLIST - NUEVO
    // ==============================
    match /checklists/{checklistId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false; // Nunca borrar checklists
    }

    match /ordenes_trabajo/{otId} {
      allow read: if true;
      allow write: if true;
    }

    match /novedades/{novedadId} {
      allow read: if true;
      allow write: if true;
    }

    match /estadisticas_unidades/{unidadId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

---

### 🔒 Opción 2: REGLAS SEGURAS (Para producción)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // ==============================
    // MARKETPLACE
    // ==============================
    match /viajes_marketplace/{viajeId} {
      allow read: if true; // Público para fleteros
      allow create: if isAuthenticated(); // Solo usuarios autenticados
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    match /ofertas_marketplace/{ofertaId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() || isAdmin();
      allow delete: if isAdmin();
    }

    match /fleteros_perfil/{fleteroId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    match /ratings_marketplace/{ratingId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if false; // Ratings son inmutables
      allow delete: if isAdmin();
    }

    // ==============================
    // CHECKLIST DE MANTENIMIENTO
    // ==============================
    match /checklists/{checklistId} {
      allow read: if true; // Todos pueden leer
      allow create: if true; // Cualquier chofer puede crear
      allow update: if isAdmin(); // Solo admin puede modificar
      allow delete: if false; // NUNCA borrar checklists (auditoría)
    }

    match /ordenes_trabajo/{otId} {
      allow read: if true;
      allow create: if true; // Auto-generadas por sistema
      allow update: if true; // Mecánicos actualizan estado
      allow delete: if isAdmin();
    }

    match /novedades/{novedadId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if isAdmin();
    }

    match /estadisticas_unidades/{unidadId} {
      allow read: if true;
      allow write: if true; // Auto-actualizadas por sistema
    }

    // ==============================
    // USUARIOS (Para autenticación)
    // ==============================
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId || isAdmin();
    }
  }
}
```

---

## 🚀 Cómo Aplicar las Reglas

### Paso 1: Ir a Firebase Console
1. Abrir: https://console.firebase.google.com/
2. Proyecto: **croog-marketplace**
3. Menú lateral: **Firestore Database**
4. Pestaña: **Rules** (Reglas)

### Paso 2: Copiar y Pegar
- Si estás en **desarrollo/testing**: Usar **Opción 1** (simples)
- Si estás en **producción**: Usar **Opción 2** (seguras)

### Paso 3: Publicar
- Click en botón **"Publish"** (Publicar)
- Esperar confirmación: "Rules published successfully"

---

## ✅ Verificación

### Probar lectura/escritura desde la app:
```typescript
// Esto debería funcionar sin errores
import { saveChecklist } from './services/checklistService';

// Al completar un checklist, se guarda en Firebase
await saveChecklist(checklistData);
```

### Desde Firebase Console:
1. Ir a **Firestore Database → Data**
2. Deberías ver las colecciones:
   - `viajes_marketplace` (ya existe)
   - `checklists` (nuevo)
   - `ordenes_trabajo` (nuevo)
   - `estadisticas_unidades` (nuevo)

---

## 🔍 Diferencias entre Opción 1 y Opción 2

| Aspecto | Opción 1 (Simple) | Opción 2 (Segura) |
|---------|-------------------|-------------------|
| **Desarrollo** | ✅ Ideal | ⚠️ Requiere auth |
| **Producción** | ❌ Inseguro | ✅ Recomendado |
| **Autenticación** | No requerida | Sí requerida |
| **Admin control** | No | Sí |
| **Auditoría** | Limitada | Completa |

---

## 💡 Recomendación

**Para ahora (testing):**
- Usar **Opción 1** (reglas simples)
- Te permite probar sin complicaciones

**Para producción:**
- Migrar a **Opción 2** (reglas seguras)
- Implementar autenticación con Firebase Auth
- Asignar roles (admin, chofer, mecánico)

---

## 🛡️ Importante

**Las reglas NO afectan las colecciones existentes del Marketplace.**

Cada `match /nombre_coleccion/{id}` es independiente. Puedes tener reglas diferentes para:
- Marketplace → Reglas ya configuradas
- Checklist → Reglas nuevas

Firebase las evalúa por separado, sin conflictos.
