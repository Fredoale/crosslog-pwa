#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 2927 where formatearFecha is called
for i, line in enumerate(lines):
    if i == 2926:  # Line 2927 (0-indexed)
        print(f"Line {i+1}: {line.strip()}")

# DRASTIC FIX: Replace the ENTIRE cargarChecklists function with a WORKING version
# The issue is likely in how we're mapping the data

old_block = """    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();

      // DEBUG: Log fecha field to understand why it's not showing
      if (!docData.fecha) {
        console.warn('[DashboardMantenimiento] ⚠️ Checklist sin campo fecha:', {
          id: doc.id,
          sector: docData.sector,
          timestamp: docData.timestamp,
          allFields: Object.keys(docData)
        });
      }

      return {
        id: doc.id,
        ...docData,
        fecha: docData.fecha
              ? (docData.fecha instanceof Timestamp ? docData.fecha.toDate() : new Date(docData.fecha))
              : (docData.timestamp
                  ? (docData.timestamp instanceof Timestamp ? docData.timestamp.toDate() : new Date(docData.timestamp))
                  : new Date()),
        timestamp: docData.timestamp
              ? (docData.timestamp instanceof Timestamp ? docData.timestamp.toDate() : new Date(docData.timestamp))
              : new Date(),
        timestampCompletado: docData.timestampCompletado
          ? (docData.timestampCompletado instanceof Timestamp ? docData.timestampCompletado.toDate() : new Date(docData.timestampCompletado))
          : new Date(),
        odometroInicial: {
          ...docData.odometroInicial,
          fecha_hora: docData.odometroInicial.fecha_hora
            ? (docData.odometroInicial.fecha_hora instanceof Timestamp ? docData.odometroInicial.fecha_hora.toDate() : new Date(docData.odometroInicial.fecha_hora))
            : new Date()
        },
        items: docData.items.map((item: any) => ({
          ...item,
          timestamp: item.timestamp
            ? (item.timestamp instanceof Timestamp ? item.timestamp.toDate() : new Date(item.timestamp))
            : new Date()
        }))
      } as ChecklistRegistro;
    });"""

new_block = """    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();

      // Helper to safely convert Timestamp or Date
      const safeDate = (value: any): Date => {
        if (!value) return new Date();
        if (value instanceof Timestamp) return value.toDate();
        if (value instanceof Date) return value;
        try {
          const d = new Date(value);
          return isNaN(d.getTime()) ? new Date() : d;
        } catch {
          return new Date();
        }
      };

      return {
        id: doc.id,
        sector: docData.sector,
        unidad: docData.unidad,
        chofer: docData.chofer,
        resultado: docData.resultado,
        itemsRechazados: docData.itemsRechazados || 0,
        itemsConformes: docData.itemsConformes || 0,
        completado: docData.completado,
        cisterna: docData.cisterna,
        firmaChofer: docData.firmaChofer,
        geolocalizacion: docData.geolocalizacion,
        hdr: docData.hdr,
        fecha: safeDate(docData.fecha || docData.timestamp),
        timestamp: safeDate(docData.timestamp),
        timestampCompletado: safeDate(docData.timestampCompletado),
        odometroInicial: {
          valor: docData.odometroInicial?.valor || 0,
          fecha_hora: safeDate(docData.odometroInicial?.fecha_hora),
          geolocalizacion: docData.odometroInicial?.geolocalizacion
        },
        odometroFinal: docData.odometroFinal ? {
          valor: docData.odometroFinal.valor,
          fecha_hora: safeDate(docData.odometroFinal.fecha_hora),
          geolocalizacion: docData.odometroFinal.geolocalizacion
        } : undefined,
        items: (docData.items || []).map((item: any) => ({
          ...item,
          timestamp: safeDate(item.timestamp)
        }))
      } as ChecklistRegistro;
    });"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if old_block in content:
    content = content.replace(old_block, new_block)
    print("[OK] COMPLETELY REPLACED cargarChecklists data mapping with SAFE version")
else:
    print("[ERROR] Could not find old block - file might have changed")
    exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] ULTIMATE FIX APPLIED!")
print("Created safeDate() helper that NEVER returns Invalid Date")
print("All date fields now use this safe converter")
