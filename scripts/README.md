# Scripts de Utilidad - Crosslog PWA

Esta carpeta contiene scripts Python utilizados para modificaciones y correcciones del proyecto.

## ⚠️ IMPORTANTE

Estos scripts son **herramientas de desarrollo** que se ejecutaron durante el proceso de desarrollo. No son parte del código fuente de la aplicación.

---

## 📁 Archivos y Descripción

### Modificaciones de Unidades y Patentes

- **`add_distribucion_units.py`** - Agrega unidades de distribución al selector de combustible
- **`update_distribucion_patentes.py`** - Actualiza las patentes de las unidades DISTRIBUCION (41, 45, 46, 54, 64, 813, 816, 187)
- **`add_all_units_to_combustible.py`** - Combina todas las unidades (VRAC + VITAL_AIRE + DISTRIBUCION) en el selector de combustible

### Correcciones de Modal y UI

- **`add_modal_to_taller.py`** - Agrega modal de crear OT al dashboard de taller
- **`add_button_and_modal.py`** - Agrega botón y modal para crear órdenes de trabajo
- **`add_modal_render.py`** - Renderiza el modal de crear OT
- **`final_fix_modal.py`** - Corrección final de posición del modal
- **`fix_modal_position.py`** - Corrige la posición del modal en el componente
- **`simple_fix_modal.py`** - Solución simple para corregir posición del modal
- **`move_modal_to_correct_component.py`** - Mueve el modal al componente correcto (DashboardTaller)
- **`fix_crear_ot_button_location.py`** - Mueve el botón "Crear OT" al header principal

### Correcciones de Servicios y Tipos

- **`fix_checklist_service.py`** - Corrige el servicio de checklists
- **`fix_checklist_service_v2.py`** - Versión 2 de corrección del servicio de checklists
- **`fix_sector_type.py`** - Actualiza tipos de sector para incluir 'distribucion'
- **`fix_checklist_id_and_dates.py`** - Agrega campo ID a checklists y corrige fechas

### Mejoras de Panel Mantenimiento

- **`add_distribucion_sector_support.py`** - Agrega soporte visual para sector DISTRIBUCIÓN en panel
- **`add_distribucion_filter_option.py`** - Agrega opción de filtro "Distribución"
- **`add_fecha_debug_logging.py`** - Agrega logging de debug para campo fecha + fallback a timestamp

### Utilidades

- **`check_encoding.py`** - Verifica encoding de archivos para detectar problemas de caracteres

---

## 🚀 Cómo Usar

Estos scripts ya fueron ejecutados durante el desarrollo. **NO necesitas ejecutarlos nuevamente** a menos que quieras revertir o repetir alguna modificación.

Para ejecutar un script:

```bash
python scripts/nombre_del_script.py
```

---

## 📝 Notas

- Todos los scripts modifican archivos directamente en `src/`
- Asegúrate de tener un backup o usar control de versiones antes de ejecutar
- Los scripts son idempotentes (se pueden ejecutar múltiples veces sin problemas)

---

## 🗑️ Limpieza

Esta carpeta puede ser eliminada si ya no necesitas los scripts de desarrollo. Todos los cambios ya están aplicados en el código fuente.
