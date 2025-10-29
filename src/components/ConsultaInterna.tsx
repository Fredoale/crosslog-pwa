import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRConsulta, FleteroEmpresa } from '../types';
import DetalleViaje from './DetalleViaje';
import AuthInterno from './AuthInterno';
import QRCodesSection from './QRCodesSection';

interface ConsultaInternaProps {
  onBack: () => void;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
const SESSION_KEY = 'crosslog_interno_session';

interface SessionData {
  authenticated: boolean;
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
];

const FLETEROS_CON_PROPIO = [...FLETEROS, 'Propio' as FleteroEmpresa];
const RESULTS_PER_PAGE = 20;

const ConsultaInterna: React.FC<ConsultaInternaProps> = ({ onBack }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'qr'>('search');
  const [searchType, setSearchType] = useState<'hdr' | 'remito' | 'fletero'>('hdr');
  const [searchValue, setSearchValue] = useState('');
  const [selectedFletero, setSelectedFletero] = useState<FleteroEmpresa | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ found: boolean; hdrs?: HDRConsulta[]; message?: string } | null>(null);
  const [selectedHDR, setSelectedHDR] = useState<HDRConsulta | null>(null);
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
          setAuthenticated(true);
          console.log('[ConsultaInterna] 🔓 Session restored');
        } else {
          // Session expired
          localStorage.removeItem(SESSION_KEY);
          console.log('[ConsultaInterna] ⏱️ Session expired');
        }
      } catch (error) {
        localStorage.removeItem(SESSION_KEY);
        console.error('[ConsultaInterna] Error loading session:', error);
      }
    }
  }, []);

  const handleAuthenticated = () => {
    setAuthenticated(true);

    // Save session to localStorage
    const session: SessionData = {
      authenticated: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    console.log('[ConsultaInterna] ✅ Internal authentication successful');
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setSearchType('hdr');
    setSearchValue('');
    setSelectedFletero('');
    setResult(null);
    setSelectedHDR(null);

    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
    console.log('[ConsultaInterna] 🚪 Logged out');
  };

  // Load all HDRs on authentication
  useEffect(() => {
    if (authenticated && !result && !loading) {
      loadAllHDRs();
    }
  }, [authenticated]);

  // Auto-search when fletero is selected
  useEffect(() => {
    if (searchType === 'fletero' && selectedFletero && !loading) {
      handleSearch();
    }
  }, [selectedFletero]);

  const loadAllHDRs = async () => {
    setLoading(true);
    try {
      const allHDRs = await sheetsApi.getAllHDRs();
      setResult(allHDRs);
      console.log('[ConsultaInterna] Loaded', allHDRs.hdrs?.length || 0, 'HDRs');
    } catch (error) {
      console.error('[ConsultaInterna] Error loading HDRs:', error);
      setResult({ found: false, message: 'Error al cargar datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchType === 'fletero' && !selectedFletero) {
      alert('Por favor seleccione un fletero');
      return;
    }

    if (searchType !== 'fletero' && !searchValue.trim()) {
      alert('Por favor ingrese un valor para buscar');
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedHDR(null);

    try {
      let searchResult;

      if (searchType === 'fletero') {
        searchResult = await sheetsApi.searchByFletero(selectedFletero);
      } else if (searchType === 'hdr') {
        // Internal: No filters (full access)
        searchResult = await sheetsApi.searchHDRByNumber(searchValue.trim());
      } else {
        // Internal: No filters (full access)
        searchResult = await sheetsApi.searchByRemito(searchValue.trim());
      }

      setResult(searchResult);
    } catch (error) {
      console.error('[ConsultaInterna] Error searching:', error);
      setResult({ found: false, message: 'Error al realizar la búsqueda' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchType !== 'fletero') {
      handleSearch();
    }
  };

  const handleLimpiar = () => {
    setSearchValue('');
    setSelectedFletero('');
    setResult(null);
    setCurrentPage(1);
  };

  // Filter by date if filter is active
  const filteredHDRs = result?.hdrs?.filter((hdr) => {
    if (!dateFilter) return true; // No filter, show all

    // Debug: log fechaViaje format
    if (dateFilter && result?.hdrs?.[0]) {
      console.log('[ConsultaInterna] fechaViaje example:', hdr.fechaViaje);
      console.log('[ConsultaInterna] dateFilter selected:', dateFilter);
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
        console.log('[ConsultaInterna] Converted DD-MM-YYYY:', fechaStr, '→', hdrDate, 'vs filter:', dateFilter);
      }
      // Check if format is YYYY-MM-DD (first part is year)
      else if (parts[0].length === 4 && parts[2].length <= 2) {
        hdrDate = fechaStr;
        console.log('[ConsultaInterna] Already YYYY-MM-DD:', hdrDate, 'vs filter:', dateFilter);
      }
      // Unknown format
      else {
        console.warn('[ConsultaInterna] Unknown date format:', fechaStr);
        return false;
      }

      return hdrDate === dateFilter;
    }

    // Fallback: try parsing with Date
    console.warn('[ConsultaInterna] Could not parse date:', fechaStr);
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
    return <AuthInterno onAuthenticated={handleAuthenticated} onBack={onBack} />;
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
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
            <span className="text-xl font-normal">- Consulta Interna</span>
          </h1>
          <p className="text-gray-300 mt-2">
            🔐 Acceso Interno Crosslog | Búsqueda avanzada con múltiples filtros
          </p>

          {/* View Mode Toggle */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setViewMode('search')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'search'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Búsqueda HDR
            </button>
            <button
              onClick={() => setViewMode('qr')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'qr'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Códigos QR
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto p-6">
        {viewMode === 'qr' ? (
          /* QR Codes Section */
          <QRCodesSection />
        ) : (
          /* Search Section */
          <>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Search Type Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => {
                setSearchType('hdr');
                setSearchValue('');
                setSelectedFletero('');
              }}
              className={`py-3 px-6 rounded-xl font-semibold transition-all ${
                searchType === 'hdr'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buscar por HDR
            </button>
            <button
              onClick={() => {
                setSearchType('remito');
                setSearchValue('');
                setSelectedFletero('');
              }}
              className={`py-3 px-6 rounded-xl font-semibold transition-all ${
                searchType === 'remito'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buscar por Remito
            </button>
            <button
              onClick={() => {
                setSearchType('fletero');
                setSearchValue('');
                setSelectedFletero('');
              }}
              className={`py-3 px-6 rounded-xl font-semibold transition-all ${
                searchType === 'fletero'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buscar por Fletero
            </button>
          </div>

          {/* Search Input or Fletero Selection */}
          {searchType === 'fletero' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Seleccione el tipo de transporte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {FLETEROS_CON_PROPIO.map((fletero) => (
                  <button
                    key={fletero}
                    onClick={() => setSelectedFletero(fletero)}
                    className={`p-3 rounded-lg font-semibold transition-all border-2 text-sm ${
                      selectedFletero === fletero
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                        : fletero.toUpperCase() === 'PROPIO'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {fletero.toUpperCase() === 'PROPIO' ? '🚛 PROPIO' : fletero}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSearch}
                  disabled={!selectedFletero || loading}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar
                    </>
                  )}
                </button>
                {(result || selectedFletero) && (
                  <button
                    onClick={handleLimpiar}
                    className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                {searchType === 'hdr' ? 'Número de HDR' : 'Número de Remito'}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchType === 'hdr' ? 'Ej: 15417' : 'Ej: 00012345'}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                  disabled={loading}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar
                    </>
                  )}
                </button>
                {(result || searchValue) && (
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
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-6">
            {result.found && result.hdrs && result.hdrs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resultados encontrados
                  </h3>
                  <div className="text-right">
                    <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-bold text-lg">
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
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
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

                {paginatedHDRs.map((hdr) => {
                  // Get unique clients from entregas
                  const clientes = Array.from(new Set(hdr.entregas.map((e: any) => e.cliente).filter(Boolean)));
                  // Count PDFs available
                  const totalPdfs = hdr.entregas.reduce((acc: number, e: any) => acc + (e.pdfUrls?.length || 0), 0);

                  return (
                  <div
                    key={hdr.hdr}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-transparent hover:border-purple-400 cursor-pointer"
                    onClick={() => setSelectedHDR(hdr)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-800 mb-2">HDR: {hdr.hdr}</h4>

                        {/* Clientes */}
                        {clientes.length > 0 && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm font-semibold">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Cliente: {clientes.join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
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
                          {hdr.fletero && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Transporte: {hdr.fletero}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-semibold">
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
                        className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(hdr.entregasCompletadas / hdr.totalEntregas) * 100}%` }}
                      ></div>
                    </div>

                    {/* Mini summary of deliveries */}
                    {hdr.entregas && hdr.entregas.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Entregas:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {hdr.entregas.slice(0, 3).map((entrega: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-purple-600 font-semibold">#{entrega.numeroEntrega}</span>
                              <span className="flex-1">{entrega.detalleEntregas || entrega.cliente}</span>
                              {entrega.pdfUrls && entrega.pdfUrls.length > 0 && (
                                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                          ))}
                          {hdr.entregas.length > 3 && (
                            <p className="text-xs text-gray-500 italic">...y {hdr.entregas.length - 3} más</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
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
                        {totalPdfs > 0 && (
                          <span className="text-sm text-blue-600 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {totalPdfs} PDF{totalPdfs > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-purple-600 font-semibold flex items-center gap-1">
                        Ver detalles
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  );
                })}

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
                                  ? 'bg-purple-600 text-white shadow-lg'
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No se encontraron resultados</h3>
                <p className="text-gray-600">{result.message || 'Intente con otro término de búsqueda'}</p>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default ConsultaInterna;
