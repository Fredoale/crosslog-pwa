import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRConsulta } from '../types';
import DetalleViaje from './DetalleViaje';
import AuthCliente from './AuthCliente';

interface ConsultaClienteProps {
  onBack: () => void;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
const SESSION_KEY = 'crosslog_cliente_session';

interface SessionData {
  clienteId: string;
  nombreCliente: string;
  timestamp: number;
}

const RESULTS_PER_PAGE = 20;

const ConsultaCliente: React.FC<ConsultaClienteProps> = ({ onBack }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'hdr' | 'remito'>('hdr');
  const [searchValue, setSearchValue] = useState('');
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
          setClienteId(session.clienteId);
          setNombreCliente(session.nombreCliente);
          setAuthenticated(true);
          console.log('[ConsultaCliente] 🔓 Session restored for:', session.nombreCliente);
        } else {
          // Session expired
          localStorage.removeItem(SESSION_KEY);
          console.log('[ConsultaCliente] ⏱️ Session expired');
        }
      } catch (error) {
        localStorage.removeItem(SESSION_KEY);
        console.error('[ConsultaCliente] Error loading session:', error);
      }
    }
  }, []);

  const handleAuthenticated = (id: string, nombre: string) => {
    setClienteId(id);
    setNombreCliente(nombre);
    setAuthenticated(true);

    // Save session to localStorage
    const session: SessionData = {
      clienteId: id,
      nombreCliente: nombre,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    console.log('[ConsultaCliente] ✅ Authenticated as:', nombre, '(ID:', id, ')');
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setClienteId(null);
    setNombreCliente(null);
    setSearchValue('');
    setResult(null);
    setSelectedHDR(null);

    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
    console.log('[ConsultaCliente] 🚪 Logged out');
  };

  // Load client's HDRs on authentication
  useEffect(() => {
    if (authenticated && clienteId && !result && !loading) {
      loadClientHDRs();
    }
  }, [authenticated, clienteId]);

  const loadClientHDRs = async () => {
    if (!clienteId) return;

    setLoading(true);
    try {
      console.log('[ConsultaCliente] 🔍 Loading HDRs for client ID:', clienteId, '(Nombre:', nombreCliente, ')');
      const clientHDRs = await sheetsApi.getAllHDRs({ clienteId: clienteId });
      console.log('[ConsultaCliente] 📋 API Response:', clientHDRs);
      console.log('[ConsultaCliente] 📋 Loaded', clientHDRs.hdrs?.length || 0, 'HDRs for client:', clienteId);
      setResult(clientHDRs);
    } catch (error) {
      console.error('[ConsultaCliente] ❌ Error loading HDRs:', error);
      setResult({ found: false, message: 'Error al cargar sus entregas' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      alert('Por favor ingrese un valor para buscar');
      return;
    }

    if (!clienteId) {
      alert('Error: No se pudo obtener su información de cliente');
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedHDR(null);

    try {
      let searchResult;

      // IMPORTANTE: Usar clienteId (ID corto como "ECO") que matchea con Dador_carga
      console.log('[ConsultaCliente] Searching with clienteId:', clienteId);

      if (searchType === 'hdr') {
        searchResult = await sheetsApi.searchHDRByNumber(searchValue.trim(), { clienteId: clienteId });
      } else {
        searchResult = await sheetsApi.searchByRemito(searchValue.trim(), { clienteId: clienteId });
      }

      setResult(searchResult);
    } catch (error) {
      console.error('[ConsultaCliente] Error searching:', error);
      setResult({ found: false, message: 'Error al realizar la búsqueda' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLimpiar = () => {
    setSearchValue('');
    setResult(null);
    setCurrentPage(1);
  };

  // Filter by date if filter is active
  const filteredHDRs = result?.hdrs?.filter((hdr) => {
    if (!dateFilter) return true; // No filter, show all

    // Debug: log fechaViaje format
    if (dateFilter && result?.hdrs?.[0]) {
      console.log('[ConsultaCliente] fechaViaje example:', hdr.fechaViaje);
      console.log('[ConsultaCliente] dateFilter selected:', dateFilter);
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
        console.log('[ConsultaCliente] Converted DD-MM-YYYY:', fechaStr, '→', hdrDate, 'vs filter:', dateFilter);
      }
      // Check if format is YYYY-MM-DD (first part is year)
      else if (parts[0].length === 4 && parts[2].length <= 2) {
        hdrDate = fechaStr;
        console.log('[ConsultaCliente] Already YYYY-MM-DD:', hdrDate, 'vs filter:', dateFilter);
      }
      // Unknown format
      else {
        console.warn('[ConsultaCliente] Unknown date format:', fechaStr);
        return false;
      }

      return hdrDate === dateFilter;
    }

    // Fallback: try parsing with Date
    console.warn('[ConsultaCliente] Could not parse date:', fechaStr);
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
    return <AuthCliente onAuthenticated={handleAuthenticated} onBack={onBack} />;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
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
            <span className="text-xl font-normal">- Consulta Cliente</span>
          </h1>
          <p className="text-gray-300 mt-2">
            Bienvenido, {nombreCliente} | Busque su entrega por HDR o número de remito
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Search Type Toggle */}
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <button
              onClick={() => setSearchType('hdr')}
              className={`py-2 px-4 rounded-xl font-semibold transition-all text-sm ${
                searchType === 'hdr'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buscar por HDR
            </button>
            <button
              onClick={() => setSearchType('remito')}
              className={`py-2 px-4 rounded-xl font-semibold transition-all text-sm ${
                searchType === 'remito'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buscar por Remito
            </button>
          </div>

          {/* Search Input */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              {searchType === 'hdr' ? 'Número de HDR' : 'Número de Remito'}
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={searchType === 'hdr' ? 'Ej: 15417' : 'Ej: 00012345'}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg"
                disabled={loading}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
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
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-6">
            {result.found && result.hdrs && result.hdrs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resultados encontrados
                  </h3>
                  <div className="text-right">
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-bold text-lg">
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
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
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
                  // Count PDFs available
                  const totalPdfs = hdr.entregas.reduce((acc: number, e: any) => acc + (e.pdfUrls?.length || 0), 0);

                  return (
                  <div
                    key={hdr.hdr}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-400 cursor-pointer"
                    onClick={() => setSelectedHDR(hdr)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-2xl font-bold text-gray-800">HDR: {hdr.hdr}</h4>
                        <p className="text-sm text-gray-600 mt-1">Fecha: {hdr.fechaViaje}</p>
                        <p className="text-sm text-gray-600">Chofer: {hdr.chofer}</p>
                        {hdr.fletero && <p className="text-sm text-gray-600">Transporte: {hdr.fletero}</p>}
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold">
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

                    {/* Mini summary of deliveries */}
                    {hdr.entregas && hdr.entregas.length > 0 && (
                      <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Entregas ({hdr.entregas.length}):</p>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {hdr.entregas.map((entrega: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-blue-600 font-semibold text-[10px]">#{entrega.numeroEntrega}</span>
                              <span className="flex-1 text-[10px] leading-tight">{entrega.detalleEntregas || entrega.numeroRemito || 'Entrega'}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                entrega.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {entrega.estado === 'COMPLETADO' ? '✓' : '○'}
                              </span>
                              {entrega.pdfUrls && entrega.pdfUrls.length > 0 && (
                                <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {hdr.entregasCompletadas === hdr.totalEntregas ? (
                            <span className="text-green-600 font-semibold flex items-center gap-1">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Viaje completado
                            </span>
                          ) : (
                            <span className="text-yellow-600 font-semibold">En curso</span>
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
                      <span className="text-blue-600 font-semibold flex items-center gap-1">
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
                                  ? 'bg-blue-600 text-white shadow-lg'
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
      </div>
    </div>
  );
};

export default ConsultaCliente;
