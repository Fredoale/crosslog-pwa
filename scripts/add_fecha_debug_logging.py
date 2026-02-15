#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add debug logging to cargarChecklists to see what data is coming from Firebase
old_code = """    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        fecha: docData.fecha
              ? (docData.fecha instanceof Timestamp ? docData.fecha.toDate() : new Date(docData.fecha))
              : new Date(),"""

new_code = """    const snapshot = await getDocs(q);
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
                  : new Date()),"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("[OK] Added debug logging for fecha field")
    print("[OK] Added fallback: use timestamp if fecha is missing")
else:
    print("[ERROR] Could not find code to update")
    exit(1)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Debug logging added!")
print("This will help identify which checklists are missing the 'fecha' field")
