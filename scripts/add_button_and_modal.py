#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the Welcome Banner to add the button
old_banner = '''      {/* Welcome Banner */}
      <div className="bg-[#1a2332] rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Taller</h2>
        <p className="text-white/90 text-sm sm:text-base">Vista general de métricas y rendimiento del taller</p>
      </div>'''

new_banner = '''      {/* Welcome Banner */}
      <div className="bg-[#1a2332] rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Taller</h2>
            <p className="text-white/90 text-sm sm:text-base">Vista general de métricas y rendimiento del taller</p>
          </div>
          <button
            onClick={() => setMostrarModalCrearOT(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Crear OT</span>
          </button>
        </div>
      </div>'''

if old_banner in content:
    content = content.replace(old_banner, new_banner)
    print("Step 1: Added 'Crear OT' button to banner")
else:
    print("WARNING: Could not find banner to replace")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Completed: Added button to header")
