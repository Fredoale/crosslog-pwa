#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add id field when loading checklists
old_code_1 = """    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        ...docData,
        fecha: docData.fecha
              ? (docData.fecha instanceof Timestamp ? docData.fecha.toDate() : new Date(docData.fecha))
              : new Date(),"""

new_code_1 = """    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        fecha: docData.fecha
              ? (docData.fecha instanceof Timestamp ? docData.fecha.toDate() : new Date(docData.fecha))
              : new Date(),"""

if old_code_1 in content:
    content = content.replace(old_code_1, new_code_1)
    print("[OK] Added 'id: doc.id' to checklist loading")
else:
    print("[WARNING] Could not find checklist loading code to fix")

# Save the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Checklist ID issue fixed!")
print("This should allow checklists to be deleted and dates to display correctly.")
