import React from 'react';

interface StandardHeaderProps {
  title: string;
  subtitle: string;
  activeTab: 'inicio' | 'operaciones' | 'administracion' | 'recursos';
  onNavigate: (tab: 'inicio' | 'operaciones' | 'administracion' | 'recursos') => void;
  onBack: () => void;
  onLogout: () => void;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  subtitle,
  activeTab,
  onNavigate,
  onBack,
  onLogout
}) => {
  return (
    <div className="bg-[#1a2332] text-white p-6 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al Menú
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="text-[#a8e063]">CROSSLOG</span>
          <span className="text-xl font-normal">- {title}</span>
        </h1>
        <p className="text-gray-300 mt-2">
          {subtitle}
        </p>

        {/* Tab Navigation - Estandarizado */}
        <div className="mt-4 grid grid-cols-4 gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('inicio')}
            className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md font-medium transition-all text-xs ${
              activeTab === 'inicio'
                ? 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white shadow-sm'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            🏠 Inicio
          </button>
          <button
            onClick={() => onNavigate('operaciones')}
            className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md font-medium transition-all text-xs ${
              activeTab === 'operaciones'
                ? 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white shadow-sm'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            📊 Operaciones
          </button>
          <button
            onClick={() => onNavigate('administracion')}
            className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md font-medium transition-all text-xs ${
              activeTab === 'administracion'
                ? 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white shadow-sm'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            ⚙️ Admin
          </button>
          <button
            onClick={() => onNavigate('recursos')}
            className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md font-medium transition-all text-xs ${
              activeTab === 'recursos'
                ? 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white shadow-sm'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            📚 Recursos
          </button>
        </div>
      </div>
    </div>
  );
};
