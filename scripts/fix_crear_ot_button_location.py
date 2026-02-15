#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove the "Crear OT" button from VistaDashboard header
# This button is in the wrong component (VistaDashboard instead of DashboardTaller)
vista_dashboard_button = '''          <button
            onClick={() => setMostrarModalCrearOT(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Crear OT</span>
          </button>'''

# Find and remove this button from VistaDashboard's header section
# It's between the title/description div and the closing of flex container
vista_header_with_button = '''          <div>
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
        </div>'''

vista_header_without_button = '''          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Taller</h2>
            <p className="text-white/90 text-sm sm:text-base">Vista general de métricas y rendimiento del taller</p>
          </div>
        </div>'''

if vista_header_with_button in content:
    content = content.replace(vista_header_with_button, vista_header_without_button)
    print("[OK] Removed 'Crear OT' button from VistaDashboard header")
else:
    print("[WARNING] Could not find button in VistaDashboard to remove")

# Step 2: Add the "Crear OT" button to DashboardTaller main header
# Add it alongside "Cambiar Perfil" and "Cerrar Sesión" buttons
dashboard_header_buttons_old = '''          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTecnicoSeleccionado(null);
                setMostrarSeleccionTecnico(true);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cambiar Perfil
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cerrar Sesión
            </button>
          </div>'''

dashboard_header_buttons_new = '''          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarModalCrearOT(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg text-xs md:text-sm font-semibold transition-all shadow-lg"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Crear OT</span>
              </span>
            </button>
            <button
              onClick={() => {
                setTecnicoSeleccionado(null);
                setMostrarSeleccionTecnico(true);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cambiar Perfil
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cerrar Sesión
            </button>
          </div>'''

if dashboard_header_buttons_old in content:
    content = content.replace(dashboard_header_buttons_old, dashboard_header_buttons_new)
    print("[OK] Added 'Crear OT' button to DashboardTaller main header")
else:
    print("[ERROR] Could not find DashboardTaller header buttons section")
    exit(1)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] 'Crear OT' button successfully moved to main header!")
