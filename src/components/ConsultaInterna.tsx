import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRConsulta, FleteroEmpresa } from '../types';
import DetalleViaje from './DetalleViaje';
import AuthInterno from './AuthInterno';
import Indicadores from './Indicadores';
import { GestionDocumentosPage } from './admin/GestionDocumentosPage';
import { QRCodesPage } from './QRCodesPage';
import { MarketplaceSection } from './marketplace/MarketplaceSection';
import { getClientFullName } from '../utils/clienteMapping';

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
  'ANDROSIUK',
  'VIMAAB',
];

const FLETEROS_CON_CROSSLOG = [...FLETEROS, 'CROSSLOG' as FleteroEmpresa];
const RESULTS_PER_PAGE = 7;

const ConsultaInterna: React.FC<ConsultaInternaProps> = ({ onBack }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<'menu' | 'search' | 'indicadores' | 'recursos' | 'documentos' | 'marketplace' | 'qrcodes'>('menu');
  const [searchType, setSearchType] = useState<'hdr' | 'remito' | 'fletero'>('hdr');
  const [searchValue, setSearchValue] = useState('');
  const [selectedFletero, setSelectedFletero] = useState<FleteroEmpresa | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ found: boolean; hdrs?: HDRConsulta[]; message?: string } | null>(null);
  const [selectedHDR, setSelectedHDR] = useState<HDRConsulta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [marketplaceHabilitadoFleteros, setMarketplaceHabilitadoFleteros] = useState(() => {
    // Leer estado inicial desde localStorage
    const stored = localStorage.getItem('crosslog_marketplace_fleteros_enabled');
    return stored === 'true';
  });

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

  const toggleMarketplaceFleteros = () => {
    const newValue = !marketplaceHabilitadoFleteros;
    setMarketplaceHabilitadoFleteros(newValue);
    localStorage.setItem('crosslog_marketplace_fleteros_enabled', String(newValue));
    console.log('[ConsultaInterna] 🔄 Marketplace para fleteros:', newValue ? 'HABILITADO' : 'DESHABILITADO');
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
    setCurrentPage(1);
    // Reload all HDRs instead of clearing results
    loadAllHDRs();
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

  // Show module selection menu after login
  if (viewMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 animate-fade-in">
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
              <span className="text-xl font-normal">- Consultas Internas</span>
            </h1>
            <p className="text-gray-300 mt-2">
              🔐 Selecciona el módulo que deseas utilizar
            </p>
          </div>
        </div>

        {/* Module Selection Grid */}
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Búsqueda HDR */}
            <button
              onClick={() => setViewMode('search')}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-[#a8e063] transition-all hover:shadow-2xl animate-scale-in group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Búsqueda HDR</h2>
                <p className="text-gray-600">
                  Busca viajes por HDR, Remito o Fletero con filtros avanzados
                </p>
              </div>
            </button>

            {/* Indicadores Crosslog */}
            <button
              onClick={() => setViewMode('indicadores')}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-[#a8e063] transition-all hover:shadow-2xl animate-scale-in group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Indicadores Crosslog</h2>
                <p className="text-gray-600">
                  Estadísticas y métricas de rendimiento de la operación
                </p>
              </div>
            </button>

            {/* Recursos */}
            <button
              onClick={() => setViewMode('recursos')}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-[#a8e063] transition-all hover:shadow-2xl animate-scale-in group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Recursos</h2>
                <p className="text-gray-600">
                  Documentación, QR Codes y herramientas de apoyo
                </p>
              </div>
            </button>

            {/* Marketplace */}
            <button
              onClick={() => setViewMode('marketplace')}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-[#a8e063] transition-all hover:shadow-2xl hover:scale-105 animate-scale-in group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Marketplace</h2>
                <p className="text-gray-600">
                  Gestiona viajes, ofertas y asignaciones de fleteros
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedHDR) {
    return (
      <DetalleViaje
        hdrData={selectedHDR}
        onBack={() => setSelectedHDR(null)}
      />
    );
  }

  // Show GestionDocumentosPage if in documentos mode
  if (viewMode === 'documentos') {
    return <GestionDocumentosPage onBack={() => setViewMode('recursos')} />;
  }

  // Show QRCodesPage if in qrcodes mode
  if (viewMode === 'qrcodes') {
    return <QRCodesPage onBack={() => setViewMode('recursos')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setViewMode('menu')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al Menú
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

          {/* View Mode Toggle - 4 Buttons */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
            <button
              onClick={() => setViewMode('search')}
              className={`px-3 md:px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'search'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Búsqueda</span>
            </button>
            <button
              onClick={() => setViewMode('indicadores')}
              className={`px-3 md:px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'indicadores'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Indicadores</span>
            </button>
            <button
              onClick={() => setViewMode('recursos')}
              className={`px-3 md:px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'recursos'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden sm:inline">Recursos</span>
            </button>
            <button
              onClick={() => setViewMode('marketplace')}
              className={`px-3 md:px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'marketplace'
                  ? 'bg-[#a8e063] text-[#1a2332] shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Marketplace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto p-6">
        {viewMode === 'marketplace' ? (
          /* Marketplace Section */
          <MarketplaceSection />
        ) : viewMode === 'indicadores' ? (
          /* Indicadores Section */
          <Indicadores onClose={() => setViewMode('search')} />
        ) : viewMode === 'recursos' ? (
          /* Recursos Section - Improved Professional Interface */
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4" style={{ borderColor: '#a8e063' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
                  <svg className="w-7 h-7 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Recursos y Documentación</h2>
                  <p className="text-sm text-gray-600 mt-1">Centro de recursos administrativos de Crosslog</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Manual de Choferes - Card Mejorada */}
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Manual de Aplicación PWA</h3>
                    <p className="text-xs text-gray-500">Guía para choferes</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">PDF</span>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Guía completa paso a paso sobre el uso seguro de la aplicación PWA y el proceso de gestión de entregas.
                </p>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Incluye instrucciones de instalación y uso diario</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href="/CROSSLOG - Manual Choferes.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver
                  </a>
                  <a
                    href="/CROSSLOG - Manual Choferes.pdf"
                    download="CROSSLOG - Manual Choferes.pdf"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-lg shadow-md border-2 border-blue-200 hover:bg-blue-50 active:scale-95 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar
                  </a>
                </div>
              </div>

              {/* Panel Administrativo - Card Mejorada */}
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Gestión de Documentos</h3>
                    <p className="text-xs text-gray-500">Panel administrativo</p>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Sistema centralizado de gestión de documentación de choferes, unidades y cuadernillos mensuales con control de vencimientos.
                </p>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Documentos de choferes y unidades</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Control automático de vencimientos</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewMode('documentos')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-600 hover:to-pink-700 active:scale-95 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Abrir Panel Administrativo
                </button>
              </div>

              {/* Códigos QR - Card Mejorada con Estado */}
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Códigos QR</h3>
                    <p className="text-xs text-gray-500">Generador de accesos</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">QR</span>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Genera códigos QR para acceso rápido a consultas de clientes y fleteros. Facilita el acceso sin necesidad de recordar códigos.
                </p>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>QR para clientes y fleteros</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Descarga e impresión</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewMode('qrcodes')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-green-700 hover:to-emerald-700 active:scale-95 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Ingresar al Generador
                </button>
              </div>

              {/* Configuración Marketplace - Card Nueva */}
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Marketplace Fleteros</h3>
                    <p className="text-xs text-gray-500">Configuración de acceso</p>
                  </div>
                  <span className={`px-2 py-1 ${marketplaceHabilitadoFleteros ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs font-semibold rounded-full`}>
                    {marketplaceHabilitadoFleteros ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Controla el acceso de fleteros al módulo Marketplace. Cuando está deshabilitado, los fleteros verán un mensaje de "Módulo en Desarrollo".
                </p>

                <div className={`bg-gradient-to-r ${marketplaceHabilitadoFleteros ? 'from-green-50 to-emerald-50' : 'from-orange-50 to-amber-50'} rounded-lg p-3 mb-4`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className={`w-3.5 h-3.5 ${marketplaceHabilitadoFleteros ? 'text-green-600' : 'text-orange-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{marketplaceHabilitadoFleteros ? 'Fleteros pueden acceder al marketplace' : 'Fleteros ven mensaje de desarrollo'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className={`w-3.5 h-3.5 ${marketplaceHabilitadoFleteros ? 'text-green-600' : 'text-orange-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{marketplaceHabilitadoFleteros ? 'Pueden ver viajes y ofertar' : 'Módulo bloqueado temporalmente'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={toggleMarketplaceFleteros}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 ${marketplaceHabilitadoFleteros ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'} text-white font-semibold rounded-lg shadow-md active:scale-95 transition-all text-sm`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={marketplaceHabilitadoFleteros ? "M6 18L18 6M6 6l12 12" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                  {marketplaceHabilitadoFleteros ? 'Deshabilitar para Fleteros' : 'Habilitar para Fleteros'}
                </button>
              </div>
            </div>

            {/* Info Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#a8e063] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Centro de Recursos Crosslog</p>
                  <p className="text-xs text-gray-600">Todos los documentos y herramientas administrativas en un solo lugar. Para soporte adicional, contacte al equipo de Crosslog.</p>
                </div>
              </div>
            </div>
          </div>
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
                {FLETEROS_CON_CROSSLOG.map((fletero) => (
                  <button
                    key={fletero}
                    onClick={() => setSelectedFletero(fletero)}
                    className={`p-3 rounded-lg font-semibold transition-all border-2 text-sm ${
                      selectedFletero === fletero
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                        : fletero.toUpperCase() === 'CROSSLOG'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {fletero.toUpperCase() === 'CROSSLOG' ? '🚛 CROSSLOG' : fletero}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  disabled={!selectedFletero || loading}
                  className="flex-1 py-3 md:py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 md:gap-3 text-base md:text-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Buscando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="whitespace-nowrap">Buscar</span>
                    </>
                  )}
                </button>
                {(result || selectedFletero) && (
                  <button
                    onClick={handleLimpiar}
                    className="px-4 md:px-6 py-3 md:py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm md:text-base">Limpiar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                {searchType === 'hdr' ? 'Número de HDR' : 'Número de Remito'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchType === 'hdr' ? 'Ej: 15417' : 'Ej: 00012345'}
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-base md:text-lg"
                  disabled={loading}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 md:px-8 py-2 md:py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Buscando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Buscar</span>
                    </>
                  )}
                </button>
                {(result || searchValue) && (
                  <button
                    onClick={handleLimpiar}
                    className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm md:text-base">Limpiar</span>
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
                  const clientes = Array.from(new Set(hdr.entregas.map((e: any) => getClientFullName(e.cliente)).filter(Boolean)));
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

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
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
                                  ? 'bg-purple-600 text-white shadow-lg'
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
