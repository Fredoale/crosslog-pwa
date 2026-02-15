#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\CarouselSector.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add a constant for ALL units (combined from VRAC, VITAL_AIRE, DISTRIBUCION)
# Insert it after UNIDADES_DISTRIBUCION
insert_after = """export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
  { numero: '816', patente: 'AH506IC' },
];"""

new_constant = """export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
  { numero: '816', patente: 'AH506IC' },
];

// Todas las unidades para Carga de Combustible (VRAC + VITAL_AIRE + DISTRIBUCION)
// Nota: Se combinan eliminando duplicados (41, 816, 817 están en múltiples listas)
export const TODAS_LAS_UNIDADES = [
  // VRAC
  { numero: '40', patente: 'AB934JF' },
  { numero: '41', patente: 'AB152AZ' },
  { numero: '48', patente: 'AC531CX' },
  { numero: '50', patente: 'AD611OK' },
  { numero: '802', patente: 'AE069SN' },
  { numero: '805', patente: 'AE936JF' },
  { numero: '806', patente: 'AF254MJ' },
  { numero: '810', patente: 'AF894TS' },
  { numero: '812', patente: 'AG835OX' },
  { numero: '814', patente: 'AG994AW' },
  { numero: '815', patente: 'AH676AV' },
  // VITAL AIRE
  { numero: '52', patente: 'AA279FE' },
  { numero: '53', patente: 'AC823TK' },
  { numero: '55', patente: 'MYN849' },
  { numero: '56', patente: 'AC823XZ' },
  { numero: '59', patente: 'KSZ061' },
  { numero: '801', patente: 'AE052TW' },
  { numero: '808', patente: 'AF313QP' },
  { numero: '811', patente: 'AG705RB' },
  { numero: '816', patente: 'AH506IC' },
  { numero: '817', patente: 'AH506ID' },
  // DISTRIBUCION (solo las que no están arriba)
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
];"""

if insert_after in content:
    content = content.replace(insert_after, new_constant)
    print("[OK] Added TODAS_LAS_UNIDADES constant")
else:
    print("[ERROR] Could not find insertion point")
    exit(1)

# Step 2: Replace UNIDADES_DISTRIBUCION with TODAS_LAS_UNIDADES in combustible selector
old_selector = """              {UNIDADES_DISTRIBUCION.sort((a, b) => a.numero.localeCompare(b.numero)).map((unidad) => (
                <option key={unidad.numero} value={unidad.numero}>
                  INT-{unidad.numero} ({unidad.patente})
                </option>
              ))}"""

new_selector = """              {TODAS_LAS_UNIDADES.sort((a, b) => a.numero.localeCompare(b.numero)).map((unidad) => (
                <option key={unidad.numero} value={unidad.numero}>
                  INT-{unidad.numero} ({unidad.patente})
                </option>
              ))}"""

if old_selector in content:
    content = content.replace(old_selector, new_selector)
    print("[OK] Updated combustible selector to use TODAS_LAS_UNIDADES")
else:
    print("[WARNING] Could not find combustible selector to update")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] All units added to Carga Combustible!")
print("Total units: VRAC (11) + VITAL_AIRE (10) + DISTRIBUCION (6 unique) = 27 units")
