import { useState, useEffect } from 'react';
import { useTallerStore } from '../../stores/tallerStore';

type TabType = 'kanban' | 'calendario' | 'historial' | 'personal';

export function TallerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('kanban');
  const { logout, personal, cargarPersonal } = useTallerStore();

  useEffect(() => {
    cargarPersonal();
  }, [cargarPersonal]);

  const handleLogout = () => {
    logout();
    window.location.reload(); // Reload to go back to login
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Panel Taller</h1>
                <p className="text-sm text-indigo-100">Gestión de Mantenimiento</p>
              </div>
            </div>

            {/* Info y logout */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold">{personal.length} Técnicos</span>
                <span className="text-xs text-indigo-100">Personal activo</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline font-semibold">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === 'kanban'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span>Kanban de Órdenes</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('calendario')}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === 'calendario'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Calendario</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === 'historial'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🚛</span>
                <span>Historial por Unidad</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('personal')}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === 'personal'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>Personal</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'kanban' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Panel Kanban</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Vista de órdenes de trabajo organizadas por estado. Podrás arrastrar y soltar para cambiar estados.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <div className="px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="text-xs font-semibold text-gray-600">🆕 PENDIENTE</span>
                </div>
                <div className="px-4 py-2 bg-blue-100 rounded-lg">
                  <span className="text-xs font-semibold text-blue-600">🔧 EN_PROCESO</span>
                </div>
                <div className="px-4 py-2 bg-amber-100 rounded-lg">
                  <span className="text-xs font-semibold text-amber-600">⏳ REPUESTOS</span>
                </div>
                <div className="px-4 py-2 bg-green-100 rounded-lg">
                  <span className="text-xs font-semibold text-green-600">✅ COMPLETADA</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                💡 Próximamente integrado con el Dashboard de Mantenimiento
              </p>
            </div>
          </div>
        )}

        {activeTab === 'calendario' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Calendario de Mantenimientos</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Vista de calendario con mantenimientos programados, preventivos y correctivos.
              </p>
              <p className="text-sm text-gray-500 mt-6">
                🔧 En desarrollo
              </p>
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚛</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Historial por Unidad</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Historial completo de mantenimientos realizados a cada unidad INT. Filtrable por unidad, fecha y tipo.
              </p>
              <p className="text-sm text-gray-500 mt-6">
                📊 En desarrollo
              </p>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Personal de Mantenimiento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestiona el equipo técnico del taller
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Personal
                </button>
              </div>
            </div>

            {/* Lista de Personal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personal.map((persona) => (
                  <div
                    key={persona.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">
                            {persona.rol === 'Encargado' && '👔'}
                            {persona.rol === 'Mecánico' && '🔧'}
                            {persona.rol === 'Herrero' && '🔨'}
                            {persona.rol === 'Ayudante' && '🛠️'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{persona.nombre}</h4>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            persona.rol === 'Encargado' ? 'bg-purple-100 text-purple-700' :
                            persona.rol === 'Mecánico' ? 'bg-blue-100 text-blue-700' :
                            persona.rol === 'Herrero' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {persona.rol}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        {persona.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    {persona.fechaIngreso && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Ingreso: {new Date(persona.fechaIngreso).toLocaleDateString('es-AR')}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                        Editar
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {personal.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">👥</div>
                  <p className="text-gray-600">No hay personal registrado</p>
                  <p className="text-sm text-gray-500 mt-1">Agrega tu primer técnico para comenzar</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
