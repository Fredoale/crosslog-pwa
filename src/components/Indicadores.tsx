import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import { getClientFullName } from '../utils/clienteMapping';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { collectHistoricalData } from '../utils/reportData';
import { generateClaudeAnalysis, validateClaudeApiKey } from '../utils/claudeAnalysis';
import { generatePDFReport, prepareChartsForPDF } from '../utils/pdfGenerator';

interface IndicadoresProps {
  onClose: () => void;
}

const Indicadores: React.FC<IndicadoresProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [mesesDisponibles, setMesesDisponibles] = useState<{ value: string; label: string }[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('todos');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('todos');

  // Estados para gráfico mensual
  const [dataMensual, setDataMensual] = useState<any[]>([]);
  const [filtroAnioMensual, setFiltroAnioMensual] = useState<string>('todos');
  const [filtroTransporte, setFiltroTransporte] = useState<string>('todos');
  const [filtroCliente, setFiltroCliente] = useState<string>('todos');
  const [filtroTipoUnidad, setFiltroTipoUnidad] = useState<string>('todos');

  // Estados para reporte inteligente
  const [showReportModal, setShowReportModal] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_CLAUDE_API_KEY || '');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'2months' | '3months' | '6months' | 'annual'>('2months');
  const [analysisPreview, setAnalysisPreview] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Extract unique years from available months
  const aniosDisponibles = React.useMemo(() => {
    const anios = new Set<string>();
    mesesDisponibles.forEach(mes => {
      const [year] = mes.value.split('-');
      anios.add(year);
    });
    return Array.from(anios).sort((a, b) => b.localeCompare(a));
  }, [mesesDisponibles]);

  // Get unique month names (1-12)
  const mesesUnicos = React.useMemo(() => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesesSet = new Set<number>();

    mesesDisponibles.forEach(mes => {
      const [year, month] = mes.value.split('-');
      const monthNum = parseInt(month, 10);
      mesesSet.add(monthNum);
    });

    return Array.from(mesesSet)
      .sort((a, b) => a - b)
      .map(monthNum => ({
        value: String(monthNum),
        label: monthNames[monthNum - 1]
      }));
  }, [mesesDisponibles]);

  useEffect(() => {
    // Load data immediately
    loadIndicadores();
    // Load available months in background
    loadMesesDisponibles();
    // Load monthly data
    loadDataMensual();
  }, []);

  useEffect(() => {
    // Reset month when year changes
    if (anioSeleccionado !== 'todos') {
      setMesSeleccionado('todos');
    }
  }, [anioSeleccionado]);

  useEffect(() => {
    // Reload data when filters change
    loadIndicadores();
  }, [anioSeleccionado, mesSeleccionado]);

  useEffect(() => {
    // Load monthly data when filters change
    loadDataMensual();
  }, [filtroAnioMensual, filtroTransporte, filtroCliente, filtroTipoUnidad]);

  const loadMesesDisponibles = async () => {
    try {
      const meses = await sheetsApi.getMesesDisponibles();
      setMesesDisponibles(meses);
    } catch (error) {
      console.error('[Indicadores] Error loading months:', error);
    }
  };

  const loadIndicadores = async () => {
    setLoading(true);
    try {
      let mesParam: string | undefined = undefined;

      // If both year and month are selected, use format "YYYY-MM"
      if (mesSeleccionado !== 'todos' && anioSeleccionado !== 'todos') {
        const mesPadded = mesSeleccionado.padStart(2, '0');
        mesParam = `${anioSeleccionado}-${mesPadded}`;
      }
      // If only year is selected, filter by year
      else if (anioSeleccionado !== 'todos' && mesSeleccionado === 'todos') {
        mesParam = anioSeleccionado; // Will be handled as year filter (e.g., "2024")
      }
      // If only month is selected without year, use format "M" (month number)
      else if (mesSeleccionado !== 'todos' && anioSeleccionado === 'todos') {
        mesParam = `M${mesSeleccionado}`; // Special prefix to indicate month-only filter
      }

      const indicadores = await sheetsApi.getIndicadores(mesParam);
      setData(indicadores);
    } catch (error) {
      console.error('[Indicadores] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataMensual = async () => {
    try {
      const data = await sheetsApi.getViajePorMes({
        anio: filtroAnioMensual !== 'todos' ? filtroAnioMensual : undefined,
        tipoTransporte: filtroTransporte !== 'todos' ? filtroTransporte : undefined,
        cliente: filtroCliente !== 'todos' ? filtroCliente : undefined,
        tipoUnidad: filtroTipoUnidad !== 'todos' ? filtroTipoUnidad : undefined,
      });
      setDataMensual(data);
    } catch (error) {
      console.error('[Indicadores] Error loading monthly data:', error);
    }
  };

  const handleGenerateIntelligentReport = async () => {
    // Validate API key
    if (!apiKey || !validateClaudeApiKey(apiKey)) {
      alert('Por favor ingresa una API Key válida de Claude (debe comenzar con sk-ant-)');
      return;
    }

    const numMonths = reportPeriod === 'annual' ? 12 : reportPeriod === '6months' ? 6 : reportPeriod === '2months' ? 2 : 3;
    const periodLabel = reportPeriod === 'annual' ? 'año' : reportPeriod === '6months' ? '6 meses' : reportPeriod === '2months' ? '2 meses' : '3 meses';

    setGeneratingReport(true);
    setReportProgress(`Recopilando datos históricos del último ${periodLabel}...`);

    try {
      // IMPORTANT: Report generation IGNORES dashboard filters
      // Uses the LAST AVAILABLE MONTH from Google Sheets as base
      // This ensures we use real data, not system date (which may be incorrect)

      if (mesesDisponibles.length === 0) {
        alert('No hay meses disponibles en Google Sheets para generar el reporte.');
        setGeneratingReport(false);
        setReportProgress('');
        return;
      }

      // Use the first month from mesesDisponibles (sorted descending = most recent first)
      const lastRealMonth = mesesDisponibles[0].value; // Format: YYYY-MM (e.g., "2025-11")

      // Keep format as YYYY-MM for collectHistoricalData (reportData.ts now accepts both formats)
      const baseMonth = lastRealMonth;

      console.log('[Report] Report generation started:', {
        reportPeriod,
        numMonths,
        lastRealMonth,
        baseMonth,
        totalMesesDisponibles: mesesDisponibles.length,
        note: 'Using LAST REAL MONTH from Google Sheets (format: YYYY-MM)'
      });
      const analysisData = await collectHistoricalData(sheetsApi, numMonths, baseMonth);
      console.log('[Report] Data collected:', analysisData);

      // VALIDATION: Check if we have actual data before calling Claude API
      if (analysisData.totalViajes === 0) {
        const monthNames = analysisData.allMonths?.map(m => m.month).join(', ') || 'periodo seleccionado';
        alert(`⚠️ NO HAY DATOS DISPONIBLES\n\nNo se encontraron viajes en los meses analizados:\n${monthNames}\n\nNo se generará el reporte para evitar consumir créditos de IA.\n\nPor favor selecciona un período con datos reales.`);
        setGeneratingReport(false);
        setReportProgress('');
        return;
      }

      // Step 2: Generate AI analysis
      setReportProgress('Generando análisis inteligente con Claude AI...');
      const analysis = await generateClaudeAnalysis(analysisData, apiKey);
      console.log('[Report] AI analysis completed');

      // Store analysis and data for preview
      setAnalysisPreview(analysis);
      setPreviewData(analysisData);
      setGeneratingReport(false);
      setShowPreview(true);
      setReportProgress('');

    } catch (error) {
      console.error('[Report] Error generating report:', error);
      alert(`Error al generar reporte: ${(error as Error).message}`);
      setGeneratingReport(false);
      setReportProgress('');
    }
  };

  const handleDownloadPDF = async () => {
    if (!analysisPreview || !previewData) {
      alert('No hay análisis disponible para descargar');
      return;
    }

    setDownloadingPDF(true);

    try {
      // Capture charts
      const charts = await prepareChartsForPDF();

      // Generate PDF
      await generatePDFReport({
        fecha: new Date().toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        analisis: analysisPreview,
        chartsElements: charts
      });

      // Reset states after successful download
      setTimeout(() => {
        setDownloadingPDF(false);
        setShowPreview(false);
        setShowReportModal(false);
        setAnalysisPreview(null);
        setPreviewData(null);
      }, 1000);

    } catch (error) {
      console.error('[PDF] Error downloading PDF:', error);
      alert(`Error al descargar PDF: ${(error as Error).message}`);
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-semibold text-gray-700">Cargando indicadores...</span>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
        <p className="text-red-600 text-center mb-4">{data?.error || 'Error al cargar datos'}</p>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
        >
          Volver a Búsqueda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 w-full max-w-7xl mx-auto">
        {/* Header with Crosslog Branding */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent flex items-center gap-3">
              <span className="text-3xl md:text-4xl">📊</span>
              CROSSLOG Indicadores
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-12">Sistema de Análisis y Reportes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden md:inline">Reporte IA</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Year and Month Filters */}
        <div className="mb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border-2 border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Filtrar por período:</span>
            </div>
            {(anioSeleccionado !== 'todos' || mesSeleccionado !== 'todos') && (
              <button
                onClick={() => {
                  setAnioSeleccionado('todos');
                  setMesSeleccionado('todos');
                }}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar Filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Year Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700"
              >
                <option value="todos">📅 Todos los años</option>
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
            {/* Month Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700"
              >
                <option value="todos">📅 Todos los meses</option>
                {mesesUnicos.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 md:p-6 mb-6 border-2 border-slate-200">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Resumen General
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-80 rounded-lg p-4">
              <div className="text-3xl md:text-4xl font-bold text-slate-900">{data.totalViajes}</div>
              <div className="text-sm text-slate-700 font-medium mt-1">Total de Viajes en BASE</div>
            </div>
          </div>
        </div>

        {/* CROSSLOG vs FLETEROS */}
        <div id="chart-crosslog-fleteros" className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border-2 border-slate-200">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            CROSSLOG vs FLETEROS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {data.crosslogVsFleteros?.map((item: any, index: number) => (
              <div key={index} className={`p-4 md:p-6 rounded-lg border-2 ${
                item.tipo === 'CROSSLOG'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
                  : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
              }`}>
                <div className="text-center">
                  <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                    item.tipo === 'CROSSLOG' ? 'text-blue-900' : 'text-green-900'
                  }`}>
                    {item.cantidad}
                  </div>
                  <div className={`text-lg md:text-xl font-bold mb-1 ${
                    item.tipo === 'CROSSLOG' ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {item.tipo}
                  </div>
                  <div className={`text-sm font-medium ${
                    item.tipo === 'CROSSLOG' ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    {item.porcentaje}% del total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Pastel General - Top Clientes */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border-2 border-green-200">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Distribución de Viajes por Cliente
          </h3>
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie
                data={data.topClientes.map((item: any) => ({
                  name: getClientFullName(item.nombre),
                  value: item.viajes
                }))}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ percent }: any) => `${(percent * 100).toFixed(1)}%`}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
              >
                {data.topClientes.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={[
                    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
                  ][index % 10]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: any) => [`${value} viajes`, 'Total']}
              />
              <Legend
                verticalAlign="bottom"
                height={80}
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución LOC / INT */}
        <div id="chart-loc-int" className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border-2 border-slate-200">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span>
            Distribución LOC / INT
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {data.distribLocInt.map((item: any, index: number) => (
              <div key={index} className={`p-4 md:p-6 rounded-lg border-2 ${
                item.tipo === 'LOC'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
                  : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300'
              }`}>
                <div className="text-center">
                  <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                    item.tipo === 'LOC' ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {item.cantidad}
                  </div>
                  <div className={`text-lg md:text-xl font-bold mb-1 ${
                    item.tipo === 'LOC' ? 'text-blue-800' : 'text-slate-800'
                  }`}>
                    {item.tipo}
                  </div>
                  <div className={`text-sm font-medium ${
                    item.tipo === 'LOC' ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                    {item.porcentaje}% del total
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Gráfico de Pastel LOC/INT */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.distribLocInt.map((item: any) => ({
                  name: item.tipo,
                  value: item.cantidad
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#6366f1" />
                <Cell fill="#a855f7" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fleteros - Full Width Horizontal */}
        <div id="chart-fleteros" className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-2 border-slate-200 mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🚚</span>
            Fleteros
          </h3>
          {data.topFleteros.length > 0 ? (
            <div className="space-y-3">
              {/* Total General Fleteros */}
              <div className="p-3 md:p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg border-2 border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-base md:text-lg">TOTAL GENERAL</span>
                  <span className="font-bold text-slate-900 text-lg md:text-xl">
                    {data.topFleteros.reduce((sum: number, item: any) => sum + item.viajes, 0)} viajes
                  </span>
                </div>
              </div>
              {/* Gráfico de Barras Horizontal */}
              <ResponsiveContainer width="100%" height={Math.min(data.topFleteros.length * 50 + 60, 400)}>
                <BarChart
                  data={data.topFleteros}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" style={{ fontSize: '12px' }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={90}
                    style={{ fontSize: '11px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #475569',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value} viajes`, 'Total']}
                  />
                  <Bar dataKey="viajes" fill="#475569" name="Viajes" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4 text-sm">No hay fleteros registrados</p>
          )}
        </div>

        {/* Top Clientes - Full Width */}
        <div id="chart-top-clientes" className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-2 border-blue-200 mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📦</span>
            Top 10 Clientes
          </h3>
          <div className="space-y-3">
            {/* Total General */}
            <div className="p-3 md:p-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg border-2 border-blue-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-900 text-base md:text-lg">TOTAL GENERAL</span>
                <span className="font-bold text-blue-900 text-lg md:text-xl">{data.totalViajes} viajes</span>
              </div>
            </div>
            {/* Gráfico de Barras Horizontal */}
            <ResponsiveContainer width="100%" height={Math.min(data.topClientes.length * 50 + 60, 400)}>
              <BarChart
                data={data.topClientes.map((item: any) => ({
                  nombre: getClientFullName(item.nombre),
                  viajes: item.viajes
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis type="number" style={{ fontSize: '12px' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={110}
                  style={{ fontSize: '11px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`${value} viajes`, 'Total']}
                />
                <Bar dataKey="viajes" fill="#3b82f6" name="Viajes" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tipos de Unidad - Full Width */}
        <div id="chart-tipos-unidad" className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-2 border-green-200 mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🚛</span>
            Tipos de Unidad
          </h3>
          <ResponsiveContainer width="100%" height={Math.min(data.topTiposUnidad.length * 50 + 60, 400)}>
            <BarChart
              data={data.topTiposUnidad}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
              <XAxis type="number" style={{ fontSize: '12px' }} />
              <YAxis
                type="category"
                dataKey="tipo"
                width={90}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #10b981',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [`${value} viajes`, 'Total']}
              />
              <Bar dataKey="cantidad" fill="#10b981" name="Cantidad" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Internos - Full Width */}
        <div id="chart-top-internos" className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-2 border-slate-200 mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🔢</span>
            Top 10 Internos
          </h3>
          <ResponsiveContainer width="100%" height={Math.min(data.topInternos.length * 50 + 60, 400)}>
            <BarChart
              data={data.topInternos}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" style={{ fontSize: '12px' }} />
              <YAxis
                type="category"
                dataKey="nombre"
                width={70}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #475569',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [`${value} viajes`, 'Total']}
              />
              <Bar dataKey="viajes" fill="#475569" name="Viajes" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Viajes por Mes */}
        <div id="chart-viaje-mes" className="bg-white rounded-xl shadow-lg p-4 md:p-6 mt-6 border-2 border-slate-200">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Proyección de Viajes Mensuales
          </h3>

          {/* Filtros del gráfico mensual */}
          <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">Filtros avanzados:</span>
              </div>
              {(filtroAnioMensual !== 'todos' || filtroTransporte !== 'todos' || filtroCliente !== 'todos' || filtroTipoUnidad !== 'todos') && (
                <button
                  onClick={() => {
                    setFiltroAnioMensual('todos');
                    setFiltroTransporte('todos');
                    setFiltroCliente('todos');
                    setFiltroTipoUnidad('todos');
                  }}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar Filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Año */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                <select
                  value={filtroAnioMensual}
                  onChange={(e) => setFiltroAnioMensual(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700 text-sm"
                >
                  <option value="todos">Todos los años</option>
                  {aniosDisponibles.map((anio) => (
                    <option key={anio} value={anio}>{anio}</option>
                  ))}
                </select>
              </div>
              {/* Tipo de Transporte */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Transporte</label>
                <select
                  value={filtroTransporte}
                  onChange={(e) => setFiltroTransporte(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="CROSSLOG">CROSSLOG</option>
                  <option value="FLETEROS">FLETEROS</option>
                </select>
              </div>
              {/* Cliente */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700 text-sm"
                >
                  <option value="todos">Todos</option>
                  {data?.topClientes?.map((cliente: any) => (
                    <option key={cliente.nombre} value={cliente.nombre}>
                      {getClientFullName(cliente.nombre)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Tipo de Unidad */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Unidad</label>
                <select
                  value={filtroTipoUnidad}
                  onChange={(e) => setFiltroTipoUnidad(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-gray-700 text-sm"
                >
                  <option value="todos">Todos</option>
                  {data?.topTiposUnidad?.map((tipo: any) => (
                    <option key={tipo.tipo} value={tipo.tipo}>
                      {tipo.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          {dataMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dataMensual} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="mes"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  style={{ fontSize: '12px' }}
                />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #475569', borderRadius: '8px' }}
                  formatter={(value: any) => [`${value} viajes`, 'Total']}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="viajes" fill="#475569" name="Viajes Totales" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 font-semibold">No hay datos disponibles</p>
                <p className="text-gray-500 text-sm mt-1">Cargando datos mensuales...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
          >
            Volver a Búsqueda
          </button>
        </div>
      </div>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full my-4 max-h-[90vh] flex flex-col ${showPreview ? 'max-w-4xl' : 'max-w-md'}`}>
            <div className="flex items-center gap-3 mb-6 p-6 pb-0 flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {showPreview ? 'Previsualización del Reporte' : 'Reporte Inteligente'}
                </h3>
                <p className="text-sm text-gray-500">Generado con Claude AI</p>
              </div>
            </div>

            {showPreview ? (
              <>
                {/* Preview Section */}
                <div className="space-y-4 px-6 overflow-y-auto flex-1">
                  {/* Period Title - Improved */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg mb-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">Período Analizado</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                          {reportPeriod === '2months' && 'Mes Actual vs Mes Anterior'}
                          {reportPeriod === '3months' && 'Últimos 3 Meses'}
                          {reportPeriod === '6months' && 'Últimos 6 Meses'}
                          {reportPeriod === 'annual' && 'Año Completo (12 Meses)'}
                        </p>
                      </div>
                    </div>
                    {previewData?.allMonths && (
                      <div className="flex flex-wrap gap-2">
                        {previewData.allMonths.map((m: any, idx: number) => (
                          <div key={idx} className="bg-white bg-opacity-10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white border-opacity-20">
                            <span className="text-white font-medium text-sm">{m.month}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumen Ejecutivo */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-blue-900 tracking-tight">RESUMEN EJECUTIVO</h3>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-blue-100">
                        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">{analysisPreview?.resumenEjecutivo}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clientes Estrella */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-amber-900 tracking-tight">CLIENTES ESTRELLA</h3>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-amber-100">
                        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">{analysisPreview?.analisisClientesEstrella}</p>
                      </div>
                    </div>
                  </div>

                  {/* Análisis de Flota */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-indigo-900 tracking-tight">ANÁLISIS DE FLOTA</h3>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-indigo-100">
                        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">{analysisPreview?.analisisFlota}</p>
                      </div>
                    </div>
                  </div>

                  {/* Alertas */}
                  {analysisPreview?.alertas && analysisPreview.alertas.length > 0 && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-xl shadow-lg hover:shadow-xl transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-5 rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-600 opacity-5 rounded-full -ml-12 -mb-12"></div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-red-900">ALERTAS</h3>
                        </div>
                        <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-red-100">
                          <ul className="space-y-3">
                            {analysisPreview.alertas.map((alerta: string, idx: number) => (
                              <li key={idx} className="text-slate-800 text-sm flex items-start gap-3 bg-white bg-opacity-70 p-3 rounded-lg border border-red-100 shadow-sm">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-white text-xs font-bold rounded-full mt-0.5 shadow-md">{idx + 1}</span>
                                <span className="flex-1 leading-relaxed">{alerta}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {analysisPreview?.recomendaciones && analysisPreview.recomendaciones.length > 0 && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 border-2 border-emerald-200 rounded-xl shadow-lg hover:shadow-xl transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-600 opacity-5 rounded-full -ml-12 -mb-12"></div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-emerald-900">RECOMENDACIONES ESTRATÉGICAS</h3>
                        </div>
                        <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-emerald-100">
                          <ul className="space-y-3">
                            {analysisPreview.recomendaciones.map((rec: string, idx: number) => (
                              <li key={idx} className="text-slate-800 text-sm flex items-start gap-3 bg-white bg-opacity-70 p-3 rounded-lg border border-emerald-100 shadow-sm">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold rounded-full mt-0.5 shadow-md">{idx + 1}</span>
                                <span className="flex-1 leading-relaxed">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 p-6 pt-4 border-t flex-shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setAnalysisPreview(null);
                      setPreviewData(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    disabled={downloadingPDF}
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {downloadingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : !generatingReport ? (
              <>
                {/* Form Content with scroll */}
                <div className="px-6 overflow-y-auto flex-1">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Período del reporte
                    </label>

                    {/* Opción destacada: Mes Actual vs Mes Anterior */}
                    <button
                      onClick={() => setReportPeriod('2months')}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left mb-3 ${
                        reportPeriod === '2months'
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md'
                          : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            reportPeriod === '2months' ? 'border-blue-600 bg-blue-600' : 'border-blue-400 bg-white'
                          }`}>
                            {reportPeriod === '2months' && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900">Mes Actual vs Mes Anterior</h3>
                              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-semibold">RECOMENDADO</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">Comparativa rápida y precisa del rendimiento mensual</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </button>

                    {/* Otras opciones compactas */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setReportPeriod('3months')}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          reportPeriod === '3months'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">📅</div>
                        <h3 className="font-semibold text-xs text-gray-900">3 Meses</h3>
                        <p className="text-xs text-gray-500">Trimestral</p>
                      </button>

                      <button
                        onClick={() => setReportPeriod('6months')}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          reportPeriod === '6months'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">📊</div>
                        <h3 className="font-semibold text-xs text-gray-900">6 Meses</h3>
                        <p className="text-xs text-gray-500">Semestral</p>
                      </button>

                      <button
                        onClick={() => setReportPeriod('annual')}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          reportPeriod === 'annual'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">📈</div>
                        <h3 className="font-semibold text-xs text-gray-900">12 Meses</h3>
                        <p className="text-xs text-gray-500">Anual</p>
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">El reporte incluye:</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>✓ Resumen ejecutivo inteligente</li>
                      <li>✓ Análisis de clientes estrella</li>
                      <li>✓ Análisis de flota y operaciones</li>
                      <li>✓ Tendencias históricas del período</li>
                      <li>✓ Alertas y recomendaciones estratégicas</li>
                      <li>✓ Gráficos detallados</li>
                    </ul>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 p-6 pt-4 border-t flex-shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportPeriod('2months');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateIntelligentReport}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
                  >
                    Generar Reporte
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                <p className="text-gray-700 font-medium">{reportProgress}</p>
                <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos momentos...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Indicadores;
