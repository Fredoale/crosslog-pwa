#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\FIREBASE_RULES_TO_UPDATE.txt'

content = """================================================================================
REGLAS DE FIREBASE FIRESTORE ACTUALIZADAS
================================================================================

PROBLEMA IDENTIFICADO:
La línea en /checklists/{checklistId} tiene:
  allow delete: if false;  ❌ IMPIDE ELIMINAR CHECKLISTS

SOLUCIÓN:
Cambiar a:
  allow delete: if isAdmin();  ✅ PERMITE ELIMINAR SOLO A ADMINS

================================================================================
PASOS PARA ACTUALIZAR:
================================================================================

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto: crosslog-pwa
3. En el menú lateral, haz clic en "Firestore Database"
4. Haz clic en la pestaña "Reglas" (Rules)
5. Reemplaza SOLO la línea de delete en checklists
6. Haz clic en "Publicar" (Publish)

================================================================================
REGLAS COMPLETAS ACTUALIZADAS (copia todo el código):
================================================================================

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
      allow delete: if isAdmin(); // ✅ CAMBIO: Admins pueden eliminar (antes era "false")
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

================================================================================
CAMBIO ESPECÍFICO REALIZADO:
================================================================================

ANTES:
    match /checklists/{checklistId} {
      allow read: if true;
      allow create: if true;
      allow update: if isAdmin();
      allow delete: if false; // ❌ NUNCA borrar checklists (auditoría)
    }

DESPUÉS:
    match /checklists/{checklistId} {
      allow read: if true;
      allow create: if true;
      allow update: if isAdmin();
      allow delete: if isAdmin(); // ✅ Admins pueden eliminar
    }

================================================================================
NOTAS IMPORTANTES:
================================================================================

⚠️  SEGURIDAD MANTENIDA:
    - Solo usuarios con role='admin' en /users/{uid} pueden eliminar
    - Choferes y usuarios normales NO pueden eliminar
    - Se mantiene el control de auditoría mediante permisos de admin

✅  FUNCIONALIDAD PRESERVADA:
    - Todas las otras reglas permanecen iguales
    - Marketplace, órdenes de trabajo, novedades sin cambios
    - Sistema de autenticación intacto

📝  RECOMENDACIÓN:
    - Después de publicar las reglas, prueba eliminar un checklist
    - Verifica que solo funcione con usuario admin
    - Monitorea los logs de Firebase para cualquier problema

================================================================================
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Archivo FIREBASE_RULES_TO_UPDATE.txt actualizado con las reglas correctas")
print("[OK] Solo se cambió: allow delete: if false; → allow delete: if isAdmin();")
