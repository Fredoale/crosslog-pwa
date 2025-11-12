import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRConsulta, FleteroEmpresa } from '../types';
import DetalleViaje from './DetalleViaje';
import AuthFletero from './AuthFletero';

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

                    <div className="flex items-center justify-between">
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
                  <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Anterior
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-2 flex-wrap justify-center">
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

                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        Siguiente
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Results Info */}
                    <div className="mt-4 text-center text-sm text-gray-600">
                      Mostrando {startIndex + 1} - {Math.min(endIndex, totalResults)} de {totalResults} resultados
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

export default ConsultaFletero;
