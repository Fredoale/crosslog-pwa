import React from 'react';
import type { PerfilConsulta } from '../types';

interface SeleccionPerfilProps {
  onSelectPerfil: (perfil: PerfilConsulta) => void;
  onBack?: () => void;
}

const SeleccionPerfil: React.FC<SeleccionPerfilProps> = ({ onSelectPerfil, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </button>
          )}
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-[#a8e063]">CROSSLOG</span>
            <span className="text-xl font-normal">Consultas</span>
          </h1>
          <p className="text-gray-300 mt-2">Seleccione su perfil de acceso</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cliente Card */}
          <button
            onClick={() => onSelectPerfil('cliente')}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center gap-4 border-2 border-transparent hover:border-blue-400 hover:scale-105 active:scale-95"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800">Cliente</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Consultar estado de entregas por HDR o número de remito
              </p>
            </div>
            <div className="mt-2 text-blue-600 font-semibold flex items-center gap-2">
              Ingresar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Fletero Card */}
          <button
            onClick={() => onSelectPerfil('fletero')}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center gap-4 border-2 border-transparent hover:border-green-400 hover:scale-105 active:scale-95"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800">Fletero</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Ver HDRs asignadas a su empresa de transporte
              </p>
            </div>
            <div className="mt-2 text-green-600 font-semibold flex items-center gap-2">
              Ingresar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Interno Card */}
          <button
            onClick={() => onSelectPerfil('interno')}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center gap-4 border-2 border-transparent hover:border-purple-400 hover:scale-105 active:scale-95"
          >
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800">Interno</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Búsqueda completa con filtros avanzados
              </p>
            </div>
            <div className="mt-2 text-purple-600 font-semibold flex items-center gap-2">
              Ingresar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-600">
          <p>Sistema de consulta de entregas CROSSLOG</p>
          <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default SeleccionPerfil;
