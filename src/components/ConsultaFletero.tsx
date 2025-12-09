import React, { useState, useEffect, useRef } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRConsulta, FleteroEmpresa } from '../types';
import type { ViajeMarketplace } from '../utils/marketplaceApi';
import DetalleViaje from './DetalleViaje';
import AuthFletero from './AuthFletero';
import { useMarketplaceStore } from '../stores/marketplaceStore';
import { buscarRequisitosCliente } from '../utils/clientesRequisitos';
import { NotificacionesToast } from './NotificacionesToast';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import { FEATURES } from '../config/features';

interface ConsultaFleteroProps {
  onBack: () => void;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
const SESSION_KEY = 'crosslog_fletero_session';

interface SessionData {
  fleteroName: string;
  timestamp: number;
}

const FLETEROS: FleteroEmpresa[] = [
  'BARCO',
  'PRODAN',
  'LOGZO',
  'DON PEDRO',
  'CALLTRUCK',
  'FALZONE',
  'ANDROSIUK',
  'VIMAAB',
];

const RESULTS_PER_PAGE = 7;

const ConsultaFletero: React.FC<ConsultaFleteroProps> = ({ onBack }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [fleteroName, setFleteroName] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<'consulta' | 'marketplace' | null>(null);
  const [selectedFletero, setSelectedFletero] = useState<FleteroEmpresa | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ found: boolean; hdrs?: HDRConsulta[]; message?: string } | null>(null);
  const [selectedHDR, setSelectedHDR] = useState<HDRConsulta | null>(null);
  const [searchType, setSearchType] = useState<'hdr' | 'remito'>('hdr');
  const [searchValue, setSearchValue] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const session: SessionData = JSON.parse(storedSession);
        const now = Date.now();
        const elapsed = now - session.timestamp;

        if (elapsed < SESSION_TIMEOUT) {
          // Session is still valid
          setFleteroName(session.fleteroName);
          setAuthenticated(true);

          // Auto-set the fletero based on authenticated name
          const matchedFletero = FLETEROS.find(f => session.fleteroName.toUpperCase().includes(f) || f.includes(session.fleteroName.toUpperCase()));
          if (matchedFletero) {
            setSelectedFletero(matchedFletero);
          }

          console.log('[ConsultaFletero] 🔓 Session restored for:', session.fleteroName);
        } else {
          // Session expired
          localStorage.removeItem(SESSION_KEY);
          console.log('[ConsultaFletero] ⏱️ Session expired');
        }
      } catch (error) {
        localStorage.removeItem(SESSION_KEY);
        console.error('[ConsultaFletero] Error loading session:', error);
      }
    }
  }, []);

  const handleAuthenticated = (name: string) => {
    setFleteroName(name);
    setAuthenticated(true);

    // Auto-set the fletero based on authenticated name
    const matchedFletero = FLETEROS.find(f => name.toUpperCase().includes(f) || f.includes(name.toUpperCase()));
    if (matchedFletero) {
      setSelectedFletero(matchedFletero);
    }

    // Save session to localStorage
    const session: SessionData = {
      fleteroName: name,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    console.log('[ConsultaFletero] ✅ Authenticated as:', name);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setFleteroName(null);
    setSelectedFletero('');
    setResult(null);
    setSelectedHDR(null);

    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
    console.log('[ConsultaFletero] 🚪 Logged out');
  };

  // Auto-search when authenticated and fletero is set
  useEffect(() => {
    if (authenticated && selectedFletero && !result && !loading) {
      handleSearch();
    }
  }, [authenticated, selectedFletero]);

  const handleSearch = async () => {
    if (!selectedFletero) {
      alert('Por favor seleccione una empresa');
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedHDR(null);
    setSearchValue(''); // Clear search filter

    try {
      const searchResult = await sheetsApi.searchByFletero(selectedFletero);
      setResult(searchResult);
    } catch (error) {
      console.error('[ConsultaFletero] Error searching:', error);
      setResult({ found: false, message: 'Error al realizar la búsqueda' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = async () => {
    if (!searchValue.trim()) {
      alert('Por favor ingrese un valor para buscar');
      return;
    }

    if (!selectedFletero) {
      alert('Error: No se pudo obtener la información del fletero');
      return;
    }

    setLoading(true);
    setSelectedHDR(null);

    try {
      let searchResult;

      if (searchType === 'hdr') {
        // Search by HDR for this fletero
        searchResult = await sheetsApi.searchHDRByNumber(searchValue.trim(), { fletero: selectedFletero });
      } else {
        // Search by remito for this fletero
        searchResult = await sheetsApi.searchByRemito(searchValue.trim(), { fletero: selectedFletero });
      }

      setResult(searchResult);
      console.log('[ConsultaFletero] Filter search completed:', searchResult);
    } catch (error) {
      console.error('[ConsultaFletero] Error in filter search:', error);
      setResult({ found: false, message: 'Error al realizar la búsqueda' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterSearch();
    }
  };

  const handleLimpiar = () => {
    setSearchValue('');
    setCurrentPage(1);
    // Reload all HDRs for the fletero
    if (selectedFletero) {
      handleSearch();
    }
  };

  // Filter by date if filter is active
  const filteredHDRs = result?.hdrs?.filter((hdr) => {
    if (!dateFilter) return true; // No filter, show all

    // Debug: log fechaViaje format
    if (dateFilter && result?.hdrs?.[0]) {
      console.log('[ConsultaFletero] fechaViaje example:', hdr.fechaViaje);
      console.log('[ConsultaFletero] dateFilter selected:', dateFilter);
    }

    // Compare fechaViaje with selected date
    // Try different date formats
    const fechaStr = hdr.fechaViaje || '';

    // Try to parse date with slash or dash separator
    const parts = fechaStr.split(/[-/]/);

    if (parts.length === 3) {
      let hdrDate: string;

      // Check if format is DD-MM-YYYY or DD/MM/YYYY (first part is day)
      if (parts[0].length <= 2 && parts[2].length === 4) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        hdrDate = `${year}-${month}-${day}`;
        console.log('[ConsultaFletero] Converted DD-MM-YYYY:', fechaStr, '→', hdrDate, 'vs filter:', dateFilter);
      }
      // Check if format is YYYY-MM-DD (first part is year)
      else if (parts[0].length === 4 && parts[2].length <= 2) {
        hdrDate = fechaStr;
        console.log('[ConsultaFletero] Already YYYY-MM-DD:', hdrDate, 'vs filter:', dateFilter);
      }
      // Unknown format
      else {
        console.warn('[ConsultaFletero] Unknown date format:', fechaStr);
        return false;
      }

      return hdrDate === dateFilter;
    }

    // Fallback: try parsing with Date
    console.warn('[ConsultaFletero] Could not parse date:', fechaStr);
    return false;
  }) || [];

  // Calculate pagination
  const totalResults = filteredHDRs.length;
  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const endIndex = startIndex + RESULTS_PER_PAGE;
  const paginatedHDRs = filteredHDRs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show authentication screen if not authenticated
  if (!authenticated) {
    return <AuthFletero onAuthenticated={handleAuthenticated} onBack={onBack} />;
  }

  // Show module selection screen
  if (!selectedModule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <button
                onClick={handleLogout}
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
              <span className="text-xl font-normal">- Consulta Fletero</span>
            </h1>
            <p className="text-gray-300 mt-2">
              Bienvenido, {fleteroName}
            </p>
          </div>
        </div>

        {/* Module Selection */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
          <div className="max-w-4xl w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center animate-fade-in">
              Seleccione un módulo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Consulta HDR Module */}
              <button
                onClick={() => setSelectedModule('consulta')}
                className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent hover:border-gray-700 text-left group animate-slide-up"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gray-100 text-gray-700 rounded-full p-4 group-hover:bg-gray-700 group-hover:text-white transition-all">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 group-hover:text-gray-700 transition-colors">
                    Consulta HDR
                  </h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Consulte el estado de sus HDRs asignadas, vea detalles de entregas y haga seguimiento de sus viajes en curso.
                </p>
              </button>

              {/* Marketplace Module */}
              <button
                onClick={() => {
                  if (!FEATURES.MARKETPLACE_FIRESTORE) {
                    alert('🚧 MÓDULO EN DESARROLLO\n\nEstamos trabajando en una nueva versión del marketplace de viaje - Crosslog.');
                    return;
                  }
                  setSelectedModule('marketplace');
                }}
                className={`bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent text-left group animate-slide-up ${FEATURES.MARKETPLACE_FIRESTORE ? 'animate-pulse-subtle' : 'opacity-70 cursor-not-allowed'}`}
                style={{
                  animationDelay: '0.1s',
                }}
                onMouseEnter={(e) => FEATURES.MARKETPLACE_FIRESTORE && (e.currentTarget.style.borderColor = '#a8e063')}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="rounded-full p-4 transition-all"
                    style={{ backgroundColor: '#f0f9e8', color: '#7ab547' }}
                    onMouseEnter={(e) => {
                      if (FEATURES.MARKETPLACE_FIRESTORE) {
                        e.currentTarget.style.backgroundColor = '#a8e063';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f9e8';
                      e.currentTarget.style.color = '#7ab547';
                    }}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3
                        className="text-2xl font-bold text-gray-800 transition-colors"
                        style={{ color: '#374151' }}
                        onMouseEnter={(e) => FEATURES.MARKETPLACE_FIRESTORE && (e.currentTarget.style.color = '#a8e063')}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
                      >
                        Marketplace de Viajes
                      </h3>
                      {!FEATURES.MARKETPLACE_FIRESTORE && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">
                          🚧 EN DESARROLLO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {FEATURES.MARKETPLACE_FIRESTORE
                    ? 'Vea viajes disponibles, envíe solicitudes de servicio y haga seguimiento de sus propuestas en el marketplace de Crosslog.'
                    : 'Pronto: actualizaciones en tiempo real, respuesta instantánea y mejor visualización de viajes.'}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Marketplace module (only if feature is enabled)
  if (selectedModule === 'marketplace') {
    if (!FEATURES.MARKETPLACE_FIRESTORE) {
      // Double-check: should not reach here, but handle gracefully
      alert('🚧 Esta funcionalidad está temporalmente deshabilitada.\n\nEstamos mejorando el Marketplace. ¡Pronto estará disponible!');
      setSelectedModule(null);
      return null;
    }
    return <MarketplaceFleteroView fleteroName={fleteroName!} onBack={() => setSelectedModule(null)} onLogout={handleLogout} />;
  }

  // Consulta HDR Module (existing functionality)
  if (selectedHDR) {
    return (
      <DetalleViaje
        hdrData={selectedHDR}
        onBack={() => setSelectedHDR(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setSelectedModule(null)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Módulos
            </button>
            <button
              onClick={handleLogout}
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
            <span className="text-xl font-normal">- Consulta HDR</span>
          </h1>
          <p className="text-gray-300 mt-2">
            Bienvenido, {fleteroName} | HDRs asignadas a {selectedFletero}
          </p>
        </div>
      </div>

      {/* Refresh Section */}
      <div className="max-w-4xl mx-auto p-6">
        {loading && !result && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-gray-700">Cargando HDRs de {selectedFletero}...</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar lista
            </button>
          </div>
        )}

        {/* Filter Section */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtrar resultados
            </h3>

            {/* Search Type Toggle */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setSearchType('hdr')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  searchType === 'hdr'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚛 Por HDR
              </button>
              <button
                onClick={() => setSearchType('remito')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  searchType === 'remito'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📄 Por Remito
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchType === 'hdr' ? 'Ingrese número de HDR' : 'Ingrese número de remito'}
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-lg disabled:bg-gray-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleFilterSearch}
                  disabled={loading || !searchValue.trim()}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </button>
                {searchValue && (
                  <button
                    onClick={handleLimpiar}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="mt-6">
            {result.found && result.hdrs && result.hdrs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    HDRs encontradas para {selectedFletero}
                  </h3>
                  <div className="text-right">
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-bold text-lg">
                      {totalResults}
                    </span>
                    {totalPages > 1 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Página {currentPage} de {totalPages}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date Filter */}
                <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Filtrar por Fecha de Viaje
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1); // Reset to first page when filtering
                      }}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                    {dateFilter && (
                      <button
                        onClick={() => setDateFilter('')}
                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                        title="Limpiar filtro"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {dateFilter && (
                    <p className="text-sm text-gray-600 mt-2">
                      Mostrando {totalResults} resultado{totalResults !== 1 ? 's' : ''} para el {new Date(dateFilter + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {paginatedHDRs.map((hdr) => (
                  <div
                    key={hdr.hdr}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-transparent hover:border-green-400 cursor-pointer"
                    onClick={() => setSelectedHDR(hdr)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-800 mb-2">HDR: {hdr.hdr}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {hdr.fechaViaje}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {hdr.chofer}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                          <span className="text-2xl">{hdr.entregasCompletadas}</span>
                          <span>/</span>
                          <span className="text-xl">{hdr.totalEntregas}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Completadas</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(hdr.entregasCompletadas / hdr.totalEntregas) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span className="text-sm">
                        {hdr.entregasCompletadas === hdr.totalEntregas ? (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Completado
                          </span>
                        ) : (
                          <span className="text-yellow-600 font-semibold flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            En curso
                          </span>
                        )}
                      </span>
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        Ver detalles
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 bg-white rounded-xl shadow-lg p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      {/* Page Numbers - Centered on mobile */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                          const showEllipsis = (page === 2 && currentPage > 4) || (page === totalPages - 1 && currentPage < totalPages - 3);

                          if (showEllipsis) {
                            return <span key={page} className="px-2 text-gray-500">...</span>;
                          }

                          if (!showPage) return null;

                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                                currentPage === page
                                  ? 'bg-green-600 text-white shadow-lg'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="hidden sm:inline">Anterior</span>
                        </button>

                        {/* Results Info */}
                        <div className="text-center text-xs sm:text-sm text-gray-600">
                          {startIndex + 1}-{Math.min(endIndex, totalResults)} de {totalResults}
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          <span className="hidden sm:inline">Siguiente</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No se encontraron HDRs</h3>
                <p className="text-gray-600">{result.message || `No hay HDRs asignadas a ${selectedFletero}`}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Marketplace Fletero View Component
// ============================================

interface MarketplaceFleteroViewProps {
  fleteroName: string;
  onBack: () => void;
  onLogout: () => void;
}

function MarketplaceFleteroView({ fleteroName, onBack, onLogout }: MarketplaceFleteroViewProps) {
  const { viajes, loading, cargarViajes } = useMarketplaceStore();
  const { agregarNotificacion } = useNotificacionesStore();
  const [activeTab, setActiveTab] = useState<'disponibles' | 'mis-viajes' | 'confirmados' | 'rechazados'>('disponibles');
  const [selectedFletero, setSelectedFletero] = useState<string>('');
  const [processingViaje, setProcessingViaje] = useState<string | null>(null);
  const [viajesAceptados, setViajesAceptados] = useState<Set<string>>(new Set());

  // Referencia para trackear viajes anteriores y detectar cambios
  const viajesAnterioresRef = useRef<ViajeMarketplace[]>([]);

  useEffect(() => {
    // Suscribirse a viajes en TIEMPO REAL con Firestore
    const unsubscribe = cargarViajes();

    console.log('[ConsultaFletero] ✨ Suscrito a viajes en tiempo real');

    // Limpiar suscripción al desmontar
    return () => {
      console.log('[ConsultaFletero] Desuscribiendo de viajes');
      unsubscribe();
    };
  }, [cargarViajes]);

  // Determinar el nombre del fletero basado en fleteroName
  useEffect(() => {
    const FLETEROS = ['BARCO', 'PRODAN', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'FALZONE', 'ANDROSIUK', 'VIMAAB'];
    const matchedFletero = FLETEROS.find(f =>
      fleteroName.toUpperCase().includes(f) || f.includes(fleteroName.toUpperCase())
    );
    if (matchedFletero) {
      setSelectedFletero(matchedFletero);
    }
  }, [fleteroName]);

  // Detectar cambios en viajes (confirmaciones y eliminaciones)
  useEffect(() => {
    const viajesAnteriores = viajesAnterioresRef.current;

    // Solo procesar si ya teníamos viajes anteriores (evitar notificaciones en carga inicial)
    if (viajesAnteriores.length > 0 && viajes.length > 0 && selectedFletero) {

      // 1. DETECTAR CONFIRMACIONES: viajes que cambiaron a CONFIRMADO
      viajes.forEach(viajeActual => {
        const viajeAnterior = viajesAnteriores.find(v => v.HDR_viaje === viajeActual.HDR_viaje);

        if (viajeAnterior && viajeAnterior.estado !== 'CONFIRMADO' && viajeActual.estado === 'CONFIRMADO') {
          // Viaje fue confirmado - Determinar si lo confirmó este fletero u otro
          const fleteroConfirmante = viajeActual.fletero_asignado?.toUpperCase() || '';
          const hdr = viajeActual.hdr_generado || viajeActual.HDR_viaje;

          if (fleteroConfirmante.includes(selectedFletero)) {
            // Este fletero confirmó el viaje
            agregarNotificacion({
              tipo: 'exito',
              titulo: 'Viaje Confirmado',
              mensaje: `Has confirmado el viaje ${hdr}`
            });
          } else {
            // Otro fletero confirmó el viaje
            agregarNotificacion({
              tipo: 'advertencia',
              titulo: 'Viaje No Disponible',
              mensaje: `Otro transporte acaba de confirmar el viaje ${hdr}. Ya no se encuentra disponible.`
            });
          }
        }
      });

      // 2. DETECTAR CANCELACIONES: viajes que cambiaron a CANCELADO
      viajes.forEach(viajeActual => {
        const viajeAnterior = viajesAnteriores.find(v => v.HDR_viaje === viajeActual.HDR_viaje);

        if (viajeAnterior && viajeAnterior.estado !== 'CANCELADO' && viajeActual.estado === 'CANCELADO') {
          // Viaje fue cancelado por Crosslog
          const hdr = viajeActual.hdr_generado || viajeActual.HDR_viaje;
          agregarNotificacion({
            tipo: 'advertencia',
            titulo: 'Viaje Cancelado',
            mensaje: `Crosslog ha cancelado el viaje ${hdr}.`
          });
        }
      });

      // 3. DETECTAR ELIMINACIONES: viajes que ya no están en la lista
      viajesAnteriores.forEach(viajeAnterior => {
        const existe = viajes.find(v => v.HDR_viaje === viajeAnterior.HDR_viaje);

        if (!existe) {
          // Viaje fue eliminado por Crosslog
          const hdr = viajeAnterior.hdr_generado || viajeAnterior.HDR_viaje;
          agregarNotificacion({
            tipo: 'info',
            titulo: 'Viaje Eliminado',
            mensaje: `Crosslog ha eliminado el viaje ${hdr}, no se encuentra disponible.`
          });
        }
      });
    }

    // Actualizar referencia con viajes actuales
    viajesAnterioresRef.current = viajes;
  }, [viajes, selectedFletero, agregarNotificacion]);

  // Filtrar solo viajes PUBLICADOS que NO hayan sido rechazados por este fletero
  const viajesDisponibles = viajes.filter(v =>
    v.estado === 'PUBLICADO' &&
    !(v.fleteros_rechazaron || []).includes(selectedFletero)
  );

  // Filtrar viajes CONFIRMADOS por otros fleteros (no por el fletero actual)
  const viajesConfirmadosPorOtros = viajes.filter(v =>
    v.estado === 'CONFIRMADO' &&
    v.fletero_asignado &&
    !v.fletero_asignado.toUpperCase().includes(selectedFletero)
  );

  console.log('[MarketplaceFletero] Total viajes cargados:', viajes.length);
  console.log('[MarketplaceFletero] Viajes por estado:', viajes.reduce((acc: any, v) => {
    acc[v.estado] = (acc[v.estado] || 0) + 1;
    return acc;
  }, {}));
  console.log('[MarketplaceFletero] Viajes PUBLICADOS:', viajesDisponibles.length);
  console.log('[MarketplaceFletero] Viajes CONFIRMADOS por otros:', viajesConfirmadosPorOtros.length);

  // Filtrar viajes asignados a este fletero (estado ASIGNADO)
  const misViajes = viajes.filter(v =>
    v.fletero_asignado &&
    v.fletero_asignado.toUpperCase().includes(selectedFletero) &&
    v.estado === 'ASIGNADO'
  );

  // Filtrar viajes confirmados por este fletero (estado CONFIRMADO)
  const viajesConfirmados = viajes.filter(v =>
    v.fletero_asignado &&
    v.fletero_asignado.toUpperCase().includes(selectedFletero) &&
    v.estado === 'CONFIRMADO'
  );

  // Filtrar viajes rechazados por este fletero
  const viajesRechazados = viajes.filter(v =>
    (v.fleteros_rechazaron || []).includes(selectedFletero)
  );

  const handleAceptarViaje = async (viaje: ViajeMarketplace) => {
    if (!selectedFletero) {
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo identificar el fletero'
      });
      return;
    }

    if (!confirm(`¿Confirmar que deseas aceptar el viaje ${viaje.hdr_generado || viaje.HDR_viaje}?`)) {
      return;
    }

    try {
      setProcessingViaje(viaje.HDR_viaje);
      const { aceptarViajeMarketplace } = await import('../utils/marketplaceApiFirestore');
      await aceptarViajeMarketplace(
        viaje.HDR_viaje,
        selectedFletero,
        selectedFletero // Using fletero name as ID for now
      );

      // NO mostrar notificación aquí - el useEffect la mostrará automáticamente
      // para evitar duplicados

      // Marcar viaje como aceptado para mostrar Maps/Copiar
      setViajesAceptados(prev => new Set(prev).add(viaje.HDR_viaje));

      // NO necesitamos recargar - onSnapshot lo actualiza automáticamente
    } catch (error: any) {
      console.error('Error al aceptar viaje:', error);

      // Notificación de error
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error al Confirmar Viaje',
        mensaje: error.message || 'Error desconocido. Por favor intenta nuevamente.'
      });
    } finally {
      setProcessingViaje(null);
    }
  };

  const handleConfirmarViaje = async (viaje: ViajeMarketplace) => {
    if (!selectedFletero) {
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo identificar el fletero'
      });
      return;
    }

    if (!confirm(`¿Confirmar que aceptas este viaje asignado ${viaje.hdr_generado || viaje.HDR_viaje}?`)) {
      return;
    }

    try {
      setProcessingViaje(viaje.HDR_viaje);
      const { confirmarViajeFlotero } = await import('../utils/marketplaceApi');
      await confirmarViajeFlotero(
        viaje.HDR_viaje,
        selectedFletero
      );

      // Notificación de éxito
      agregarNotificacion({
        tipo: 'exito',
        titulo: 'Viaje Confirmado',
        mensaje: `${selectedFletero} ha confirmado el viaje asignado ${viaje.hdr_generado || viaje.HDR_viaje}. Crosslog ha sido notificado automáticamente.`
      });

      // Reload viajes
      await cargarViajes();
    } catch (error: any) {
      console.error('Error al confirmar viaje:', error);

      // Notificación de error
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error al Confirmar Viaje',
        mensaje: error.message || 'Error desconocido. Por favor intenta nuevamente.'
      });
    } finally {
      setProcessingViaje(null);
    }
  };

  const handleWhatsApp = (viaje: ViajeMarketplace) => {
    const mensaje = `Hola, me interesa el viaje ${viaje.hdr_generado || viaje.HDR_viaje} - ${viaje.cliente_nombre} - ${viaje.fecha_viaje}`;
    const url = `https://wa.me/5491234567890?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const handleRechazar = async (viaje: ViajeMarketplace) => {
    if (!selectedFletero) {
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo identificar el fletero'
      });
      return;
    }

    if (!confirm(`¿Seguro que no te interesa el viaje ${viaje.hdr_generado || viaje.HDR_viaje}?\n\nEste viaje será ocultado de tu lista.`)) {
      return;
    }

    try {
      setProcessingViaje(viaje.HDR_viaje);
      const { rechazarViajeMarketplace } = await import('../utils/marketplaceApiFirestore');
      await rechazarViajeMarketplace(
        viaje.HDR_viaje,
        selectedFletero
      );

      // Notificación de éxito
      agregarNotificacion({
        tipo: 'info',
        titulo: 'Viaje Rechazado',
        mensaje: `Has rechazado el viaje ${viaje.hdr_generado || viaje.HDR_viaje}. Puedes verlo en la pestaña "Viajes Rechazados".`
      });

      // NO necesitamos recargar - onSnapshot lo actualiza automáticamente
    } catch (error: any) {
      console.error('Error al rechazar viaje:', error);

      // Notificación de error
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error al Rechazar Viaje',
        mensaje: error.message || 'Error desconocido. Por favor intenta nuevamente.'
      });
    } finally {
      setProcessingViaje(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 animate-fade-in">
      {/* Sistema de Notificaciones */}
      <NotificacionesToast />

      {/* Header */}
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
              Volver a Módulos
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
          <h1 className="text-3xl font-bold flex items-center gap-3 animate-slide-up">
            <span className="text-[#a8e063]">CROSSLOG</span>
            <span className="text-xl font-normal">- Marketplace de Viajes</span>
          </h1>
          <p className="text-gray-300 mt-2 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Bienvenido, {fleteroName}
          </p>

          {/* Tabs - Movidos al header */}
          <div className="flex gap-2 mt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => setActiveTab('disponibles')}
              className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                activeTab === 'disponibles'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'bg-white/50 text-gray-300 hover:bg-white/70 hover:text-gray-600'
              }`}
            >
              📦 Viajes Disponibles ({viajesDisponibles.length})
            </button>
            <button
              onClick={() => setActiveTab('mis-viajes')}
              className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                activeTab === 'mis-viajes'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'bg-white/50 text-gray-300 hover:bg-white/70 hover:text-gray-600'
              }`}
            >
              🚛 Viajes Asignados ({misViajes.length})
            </button>
            <button
              onClick={() => setActiveTab('confirmados')}
              className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                activeTab === 'confirmados'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'bg-white/50 text-gray-300 hover:bg-white/70 hover:text-gray-600'
              }`}
            >
              ✅ Viajes Confirmados ({viajesConfirmados.length})
            </button>
            <button
              onClick={() => setActiveTab('rechazados')}
              className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                activeTab === 'rechazados'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'bg-white/50 text-gray-300 hover:bg-white/70 hover:text-gray-600'
              }`}
            >
              ❌ Viajes Rechazados ({viajesRechazados.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'disponibles' && (
          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
                <p className="mt-4 text-gray-600">Cargando viajes disponibles...</p>
              </div>
            )}

            {!loading && viajesDisponibles.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No hay viajes disponibles</h3>
                <p className="text-gray-600">Por el momento no hay viajes publicados en el marketplace</p>
              </div>
            )}

            {!loading && viajesDisponibles.map((viaje, index) => {
              // Extraer tarifa de las notas internas (sin info de confirmación)
              const extraerTarifa = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\n\|]+)/);
                  return match ? match[1].trim() : 'N/A';
                }
                return 'N/A';
              };

              // Extraer información de confirmación
              const extraerConfirmacion = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/\[CONFIRMADO por (.+?) el (.+?)\]/);
                  if (match) {
                    return { fletero: match[1], fecha: match[2] };
                  }
                }
                return null;
              };

              // Separar rutas en cargas y descargas
              const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
              const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

              // Verificar si el viaje ha sido aceptado
              const viajeAceptado = viajesAceptados.has(viaje.HDR_viaje);
              const confirmacion = extraerConfirmacion();

              // Buscar alertas/requisitos del cliente y destinos
              const buscarAlertasViaje = () => {
                const alertas = [];

                // Alerta del cliente
                const reqCliente = buscarRequisitosCliente(viaje.cliente_nombre);
                if (reqCliente) {
                  alertas.push(reqCliente);
                }

                // Alertas de destinos
                descargas.forEach(descarga => {
                  const req = buscarRequisitosCliente(descarga.direccion);
                  if (req) {
                    alertas.push(req);
                  }
                });

                return alertas;
              };

              const alertasViaje = buscarAlertasViaje();

              return (
                <div
                  key={viaje.HDR_viaje}
                  className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200 hover:border-[#a8e063] transition-all hover:shadow-2xl animate-slide-up animate-pulse-subtle relative overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Borde animado superior */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-700 via-[#a8e063] to-gray-700"></div>

                  {/* Banner de confirmación */}
                  {confirmacion && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#a8e063] p-3 mb-4 rounded-r-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-800">{confirmacion.fletero} confirmó este viaje</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {/* Info Principal */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            HDR: {viaje.hdr_generado || viaje.HDR_viaje}
                          </h3>
                          <p className="text-gray-600 text-xs mt-1">{viaje.cliente_nombre}</p>
                        </div>
                        <span className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-2 py-1 rounded-lg text-xs font-semibold border border-gray-300">
                          {viaje.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Fecha de Viaje</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.fecha_viaje}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tipo de Carga</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_carga}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidad Requerida</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_unidad_requerida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tarifa</p>
                          <p className="font-bold text-[#a8e063] text-sm uppercase">
                            {extraerTarifa()}
                          </p>
                        </div>
                      </div>

                      {/* Ruta */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ruta</p>
                        <div className="space-y-2">
                          {cargas.map((carga, idx) => (
                            <div key={`carga-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-gray-700 hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-700 uppercase whitespace-nowrap">Punto de Carga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{carga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Horario: {carga.horario_desde}</p>
                                </div>
                                {viajeAceptado && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => window.open(carga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(carga.direccion)}`, '_blank')}
                                      className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                      title="Ver en Google Maps"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Maps
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(carga.link_maps || carga.direccion);
                                        alert('✅ Link copiado');
                                      }}
                                      className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                      title="Copiar link"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                      </svg>
                                      Copiar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {descargas.map((descarga, idx) => (
                            <div key={`descarga-${idx}`} className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-[#a8e063] hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-green-700 uppercase whitespace-nowrap">Punto de Descarga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{descarga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Reciben hasta: {descarga.horario_hasta}</p>
                                </div>
                                {viajeAceptado && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => window.open(descarga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(descarga.direccion)}`, '_blank')}
                                      className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                      title="Ver en Google Maps"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Maps
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(descarga.link_maps || descarga.direccion);
                                        alert('✅ Link copiado');
                                      }}
                                      className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                      title="Copiar link"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                      </svg>
                                      Copiar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requisitos/Alertas */}
                      {alertasViaje.length > 0 && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mb-3 animate-scale-in">
                          <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Requerimientos
                          </p>
                          <div className="space-y-1">
                            {alertasViaje.map((alerta, index) => (
                              <div key={index} className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-900">{alerta.nombre}</p>
                                <p className="text-xs text-gray-700 mt-1">{alerta.descripcion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                      <button
                        onClick={() => handleAceptarViaje(viaje)}
                        disabled={processingViaje === viaje.HDR_viaje}
                        className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-semibold hover:from-gray-800 hover:to-gray-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {processingViaje === viaje.HDR_viaje ? 'Procesando...' : 'Aceptar'}
                      </button>
                      <a
                        href={`https://wa.me/5491234567890?text=${encodeURIComponent(`Consulta sobre viaje ${viaje.hdr_generado || viaje.HDR_viaje}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white rounded-lg font-semibold hover:from-[#56ab2f] hover:to-[#a8e063] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        onClick={() => handleRechazar(viaje)}
                        disabled={processingViaje === viaje.HDR_viaje}
                        className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-lg font-semibold hover:from-gray-300 hover:to-gray-400 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Viajes confirmados por otros fleteros - Opción B */}
            {!loading && viajesConfirmadosPorOtros.length > 0 && (
              <div className="mt-6">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-3 mb-4">
                  <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Viajes ya confirmados por otros transportes
                  </p>
                </div>

                {viajesConfirmadosPorOtros.map((viaje, index) => {
                  const extraerTarifa = () => {
                    if (viaje.notas_internas) {
                      const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\|\n]+)/);
                      return match ? match[1].trim() : 'N/A';
                    }
                    return 'N/A';
                  };

                  const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
                  const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

                  return (
                    <div
                      key={viaje.HDR_viaje}
                      className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-300 transition-all mb-4 relative overflow-hidden opacity-60"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Banner de confirmación por otro */}
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-l-4 border-amber-500 p-3 mb-4 rounded-r-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900">
                              ⚠️ Viaje confirmado por {viaje.fletero_asignado?.toUpperCase()}
                            </p>
                            <p className="text-xs text-amber-700">Este viaje ya no está disponible</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        {/* Info Principal - Compacta */}
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-gray-500">
                                HDR: {viaje.hdr_generado || viaje.HDR_viaje}
                              </h3>
                              <p className="text-gray-400 text-xs mt-1">{viaje.cliente_nombre}</p>
                            </div>
                            <span className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-2 py-1 rounded-lg text-xs font-semibold border border-amber-300">
                              {viaje.estado}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-400">Fecha de Viaje</p>
                              <p className="font-semibold text-gray-500 text-xs">{viaje.fecha_viaje}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Tarifa</p>
                              <p className="font-bold text-gray-500 text-sm uppercase">
                                {extraerTarifa()}
                              </p>
                            </div>
                          </div>

                          {/* Ruta - Muy compacta */}
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ruta</p>
                            <div className="space-y-1">
                              {cargas.map((carga, idx) => (
                                <div key={`carga-${idx}`} className="bg-gray-50 p-2 rounded-lg border-l-4 border-gray-300">
                                  <p className="text-xs text-gray-500">
                                    <span className="font-bold">Carga:</span> {carga.direccion}
                                  </p>
                                </div>
                              ))}
                              {descargas.map((descarga, idx) => (
                                <div key={`descarga-${idx}`} className="bg-green-50 p-2 rounded-lg border-l-4 border-green-200">
                                  <p className="text-xs text-gray-500">
                                    <span className="font-bold">Descarga:</span> {descarga.direccion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mis-viajes' && (
          <div className="space-y-4">
            {!selectedFletero && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No se pudo identificar el fletero</h3>
                <p className="text-gray-600">Por favor contacte al administrador</p>
              </div>
            )}

            {selectedFletero && misViajes.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No tienes viajes asignados</h3>
                <p className="text-gray-600">Cuando Crosslog te asigne viajes, aparecerán aquí</p>
              </div>
            )}

            {selectedFletero && misViajes.map((viaje, index) => {
              // Extraer tarifa de las notas internas (sin info de confirmación)
              const extraerTarifa = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\|\n]+)/);
                  return match ? match[1].trim() : 'N/A';
                }
                return 'N/A';
              };

              // Extraer información de confirmación
              const extraerConfirmacion = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/\[CONFIRMADO por (.+?) el (.+?)\]/);
                  if (match) {
                    return { fletero: match[1], fecha: match[2] };
                  }
                }
                return null;
              };

              // Separar rutas en cargas y descargas
              const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
              const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

              const confirmacion = extraerConfirmacion();

              // Buscar alertas/requisitos del cliente y destinos
              const buscarAlertasViaje = () => {
                const alertas = [];

                // Alerta del cliente
                const reqCliente = buscarRequisitosCliente(viaje.cliente_nombre);
                if (reqCliente) {
                  alertas.push(reqCliente);
                }

                // Alertas de destinos
                descargas.forEach(descarga => {
                  const req = buscarRequisitosCliente(descarga.direccion);
                  if (req) {
                    alertas.push(req);
                  }
                });

                return alertas;
              };

              const alertasViaje = buscarAlertasViaje();

              return (
                <div
                  key={viaje.HDR_viaje}
                  className={`bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200 hover:border-[#a8e063] transition-all hover:shadow-2xl animate-slide-up relative overflow-hidden ${
                    viaje.estado === 'ASIGNADO' && !viaje.fecha_completado ? 'animate-pulse-subtle' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Borde animado superior */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-700 via-[#a8e063] to-gray-700"></div>

                  {/* Banner de confirmación */}
                  {confirmacion && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#a8e063] p-3 mb-4 rounded-r-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-800">Ha sido confirmado este viaje</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {/* Info Principal */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            HDR: {viaje.hdr_generado || viaje.HDR_viaje}
                          </h3>
                          <p className="text-gray-600 text-xs mt-1">{viaje.cliente_nombre}</p>
                        </div>
                        <span className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-2 py-1 rounded-lg text-xs font-semibold border border-gray-300">
                          {viaje.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Fecha de Viaje</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.fecha_viaje}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tipo de Carga</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_carga}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidad Requerida</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_unidad_requerida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tarifa</p>
                          <p className="font-bold text-[#a8e063] text-sm uppercase">
                            {extraerTarifa()}
                          </p>
                        </div>
                      </div>

                      {/* Ruta */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ruta</p>
                        <div className="space-y-2">
                          {cargas.map((carga, idx) => (
                            <div key={`carga-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-gray-700 hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-700 uppercase whitespace-nowrap">Punto de Carga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{carga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Horario: {carga.horario_desde}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => window.open(carga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(carga.direccion)}`, '_blank')}
                                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                    title="Ver en Google Maps"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Maps
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(carga.link_maps || carga.direccion);
                                      alert('✅ Link copiado');
                                    }}
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                    title="Copiar link"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {descargas.map((descarga, idx) => (
                            <div key={`descarga-${idx}`} className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-[#a8e063] hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-green-700 uppercase whitespace-nowrap">Punto de Descarga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{descarga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Reciben hasta: {descarga.horario_hasta}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => window.open(descarga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(descarga.direccion)}`, '_blank')}
                                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                    title="Ver en Google Maps"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Maps
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(descarga.link_maps || descarga.direccion);
                                      alert('✅ Link copiado');
                                    }}
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                    title="Copiar link"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requisitos/Alertas */}
                      {alertasViaje.length > 0 && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mb-3 animate-scale-in">
                          <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Requerimientos
                          </p>
                          <div className="space-y-1">
                            {alertasViaje.map((alerta, index) => (
                              <div key={index} className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-900">{alerta.nombre}</p>
                                <p className="text-xs text-gray-700 mt-1">{alerta.descripcion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Badge de Asignación Directa */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mt-3 hover:shadow-md transition-all animate-scale-in">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs font-bold text-gray-800">
                            Viaje asignado por Crosslog
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                      {!confirmacion && (
                        <button
                          onClick={() => handleConfirmarViaje(viaje)}
                          disabled={loading}
                          className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-semibold hover:from-gray-800 hover:to-gray-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirmar
                        </button>
                      )}
                      <a
                        href={`https://wa.me/5491234567890?text=${encodeURIComponent(`Consulta sobre viaje ${viaje.hdr_generado || viaje.HDR_viaje}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white rounded-lg font-semibold hover:from-[#56ab2f] hover:to-[#a8e063] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Consultar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'confirmados' && (
          <div className="space-y-4">
            {!selectedFletero && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No se pudo identificar el fletero</h3>
                <p className="text-gray-600">Por favor contacte al administrador</p>
              </div>
            )}

            {selectedFletero && viajesConfirmados.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No tienes viajes confirmados</h3>
                <p className="text-gray-600">Los viajes que confirmes aparecerán aquí</p>
              </div>
            )}

            {selectedFletero && viajesConfirmados.map((viaje, index) => {
              // Extraer tarifa de las notas internas (sin info de confirmación)
              const extraerTarifa = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\|\n]+)/);
                  return match ? match[1].trim() : 'N/A';
                }
                return 'N/A';
              };

              // Extraer información de confirmación
              const extraerConfirmacion = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/\[CONFIRMADO por (.+?) el (.+?)\]/);
                  if (match) {
                    return { fletero: match[1], fecha: match[2] };
                  }
                }
                return null;
              };

              // Separar rutas en cargas y descargas
              const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
              const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

              const confirmacion = extraerConfirmacion();

              // Buscar alertas/requisitos del cliente y destinos
              const buscarAlertasViaje = () => {
                const alertas = [];

                // Alerta del cliente
                const reqCliente = buscarRequisitosCliente(viaje.cliente_nombre);
                if (reqCliente) {
                  alertas.push(reqCliente);
                }

                // Alertas de destinos
                descargas.forEach(descarga => {
                  const req = buscarRequisitosCliente(descarga.direccion);
                  if (req) {
                    alertas.push(req);
                  }
                });

                return alertas;
              };

              const alertasViaje = buscarAlertasViaje();

              return (
                <div
                  key={viaje.HDR_viaje}
                  className="bg-white rounded-2xl shadow-xl p-4 border-2 border-[#a8e063] hover:border-[#56ab2f] transition-all hover:shadow-2xl animate-slide-up relative overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Borde animado superior */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a8e063] via-green-500 to-[#a8e063]"></div>

                  {/* Banner de confirmación */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#a8e063] p-3 mb-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-800">✅ Viaje Confirmado</p>
                        {confirmacion && (
                          <p className="text-xs text-green-700">Confirmado el {confirmacion.fecha}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Info Principal */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            HDR: {viaje.hdr_generado || viaje.HDR_viaje}
                          </h3>
                          <p className="text-gray-600 text-xs mt-1">{viaje.cliente_nombre}</p>
                        </div>
                        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-1 rounded-lg text-xs font-semibold border border-green-300">
                          {viaje.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Fecha de Viaje</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.fecha_viaje}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tipo de Carga</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_carga}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidad Requerida</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_unidad_requerida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tarifa</p>
                          <p className="font-bold text-[#a8e063] text-sm uppercase">
                            {extraerTarifa()}
                          </p>
                        </div>
                      </div>

                      {/* Ruta */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ruta</p>
                        <div className="space-y-2">
                          {cargas.map((carga, idx) => (
                            <div key={`carga-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-gray-700 hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-700 uppercase whitespace-nowrap">Punto de Carga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{carga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Horario: {carga.horario_desde}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => window.open(carga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(carga.direccion)}`, '_blank')}
                                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                    title="Ver en Google Maps"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Maps
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(carga.link_maps || carga.direccion);
                                      alert('✅ Link copiado');
                                    }}
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                    title="Copiar link"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {descargas.map((descarga, idx) => (
                            <div key={`descarga-${idx}`} className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-[#a8e063] hover:shadow-md transition-all animate-fade-in">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-green-700 uppercase whitespace-nowrap">Punto de Descarga:</span>
                                  </div>
                                  <span className="text-xs text-gray-800 font-semibold block">{descarga.direccion}</span>
                                  <p className="text-xs text-gray-600 mt-1">⏰ Reciben hasta: {descarga.horario_hasta}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => window.open(descarga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(descarga.direccion)}`, '_blank')}
                                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                                    title="Ver en Google Maps"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Maps
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(descarga.link_maps || descarga.direccion);
                                      alert('✅ Link copiado');
                                    }}
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                                    title="Copiar link"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requisitos/Alertas */}
                      {alertasViaje.length > 0 && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mb-3 animate-scale-in">
                          <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Requerimientos
                          </p>
                          <div className="space-y-1">
                            {alertasViaje.map((alerta, index) => (
                              <div key={index} className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-900">{alerta.nombre}</p>
                                <p className="text-xs text-gray-700 mt-1">{alerta.descripcion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                      <a
                        href={`https://wa.me/5491234567890?text=${encodeURIComponent(`Consulta sobre viaje ${viaje.hdr_generado || viaje.HDR_viaje}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[140px] py-2.5 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white rounded-lg font-semibold hover:from-[#56ab2f] hover:to-[#a8e063] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm animate-scale-in"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Consultar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'rechazados' && (
          <div className="space-y-4">
            {!selectedFletero && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No se pudo identificar el fletero</h3>
                <p className="text-gray-600">Por favor contacte al administrador</p>
              </div>
            )}

            {selectedFletero && viajesRechazados.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-scale-in">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No tienes viajes rechazados</h3>
                <p className="text-gray-600">Los viajes que rechaces aparecerán aquí temporalmente</p>
              </div>
            )}

            {selectedFletero && viajesRechazados.map((viaje, index) => {
              // Extraer tarifa de las notas internas
              const extraerTarifa = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\|\n]+)/);
                  return match ? match[1].trim() : 'N/A';
                }
                return 'N/A';
              };

              // Extraer información de rechazo
              const extraerRechazo = () => {
                if (viaje.notas_internas) {
                  const match = viaje.notas_internas.match(/\[RECHAZADO por (.+?) el (.+?)\]/);
                  if (match) {
                    return { fletero: match[1], fecha: match[2] };
                  }
                }
                return null;
              };

              // Separar rutas en cargas y descargas
              const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
              const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

              const rechazo = extraerRechazo();

              // Buscar alertas/requisitos del cliente y destinos
              const buscarAlertasViaje = () => {
                const alertas = [];

                // Alerta del cliente
                const reqCliente = buscarRequisitosCliente(viaje.cliente_nombre);
                if (reqCliente) {
                  alertas.push(reqCliente);
                }

                // Alertas de destinos
                descargas.forEach(descarga => {
                  const req = buscarRequisitosCliente(descarga.direccion);
                  if (req) {
                    alertas.push(req);
                  }
                });

                return alertas;
              };

              const alertasViaje = buscarAlertasViaje();

              return (
                <div
                  key={viaje.HDR_viaje}
                  className="bg-white rounded-2xl shadow-xl p-4 border-2 border-red-300 hover:border-red-400 transition-all hover:shadow-2xl animate-slide-up relative overflow-hidden opacity-75"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Borde animado superior */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-red-500 to-red-400"></div>

                  {/* Banner de rechazo */}
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 p-3 mb-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-800">❌ Viaje Rechazado</p>
                        {rechazo && (
                          <p className="text-xs text-red-700">Rechazado el {rechazo.fecha}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Info Principal */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            HDR: {viaje.hdr_generado || viaje.HDR_viaje}
                          </h3>
                          <p className="text-gray-600 text-xs mt-1">{viaje.cliente_nombre}</p>
                        </div>
                        <span className="bg-gradient-to-r from-red-100 to-rose-100 text-red-800 px-2 py-1 rounded-lg text-xs font-semibold border border-red-300">
                          {viaje.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Fecha de Viaje</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.fecha_viaje}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tipo de Carga</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_carga}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidad Requerida</p>
                          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_unidad_requerida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tarifa</p>
                          <p className="font-bold text-[#a8e063] text-sm uppercase">
                            {extraerTarifa()}
                          </p>
                        </div>
                      </div>

                      {/* Ruta - Formato compacto */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ruta</p>
                        <div className="space-y-2">
                          {cargas.map((carga, idx) => (
                            <div key={`carga-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded-lg border-l-4 border-gray-400">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-gray-700 uppercase">Carga:</span>
                                  <span className="text-xs text-gray-800 font-semibold ml-2">{carga.direccion}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {descargas.map((descarga, idx) => (
                            <div key={`descarga-${idx}`} className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border-l-4 border-green-300">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-green-700 uppercase">Descarga:</span>
                                  <span className="text-xs text-gray-800 font-semibold ml-2">{descarga.direccion}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requisitos/Alertas */}
                      {alertasViaje.length > 0 && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mb-3 animate-scale-in">
                          <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Requerimientos
                          </p>
                          <div className="space-y-1">
                            {alertasViaje.map((alerta, index) => (
                              <div key={index} className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-900">{alerta.nombre}</p>
                                <p className="text-xs text-gray-700 mt-1">{alerta.descripcion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nota informativa */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                        <p className="text-xs text-red-700">
                          <span className="font-semibold">Nota:</span> Este viaje permanecerá visible temporalmente y luego desaparecerá automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsultaFletero;
