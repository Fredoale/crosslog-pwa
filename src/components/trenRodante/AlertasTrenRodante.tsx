/**
 * ALERTAS TREN RODANTE VRAC
 * Muestra el estado de mantenimiento de los semirremolques
 * - Inspección Ligera (40K) - Ciclo independiente
 * - Mantenimiento (80K/160K) - Ciclo alternado
 */

import React, { useState, useEffect } from 'react';
import {
  obtenerAlertasTrenRodante,
  formatearKm,
  formatearFecha,
} from '../../services/trenRodanteService';
import type {
  AlertaInspeccionLigera,
  AlertaMantenimientoTR,
  EstadoAlertaTR,
} from '../../types/trenRodante';

// Datos para generar OT desde alerta
export interface DatosOTTrenRodante {
  unidadNumero: string;
  tipo: '40K' | '80K' | '160K';
  kilometrajeActual: number;
  kilometrajeProximo: number;
  fechaUltimoMant: Date;
  estado: EstadoAlertaTR;
}

interface AlertasTrenRodanteProps {
  onSeleccionarUnidad?: (unidadNumero: string, tipo: '40K' | '80K' | '160K') => void;
  onGenerarOT?: (datos: DatosOTTrenRodante) => void;
  compacto?: boolean;
}

const AlertasTrenRodante: React.FC<AlertasTrenRodanteProps> = ({
  onSeleccionarUnidad,
  onGenerarOT,
  compacto = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertasInspLig, setAlertasInspLig] = useState<AlertaInspeccionLigera[]>([]);
  const [alertasMant, setAlertasMant] = useState<AlertaMantenimientoTR[]>([]);
  const [resumen, setResumen] = useState({
    totalUnidades: 0,
    vencidos: 0,
    proximos: 0,
    ok: 0,
  });
  const [tabActiva, setTabActiva] = useState<'40K' | '80K-160K'>('40K');
  const [filtroEstado, setFiltroEstado] = useState<EstadoAlertaTR | 'TODOS'>('TODOS');

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await obtenerAlertasTrenRodante();
      setAlertasInspLig(resultado.inspeccionLigera);
      setAlertasMant(resultado.mantenimiento);
      setResumen(resultado.resumen);
    } catch (err) {
      console.error('[AlertasTrenRodante] Error:', err);
      setError('Error al cargar alertas de tren rodante');
    } finally {
      setLoading(false);
    }
  };

  const getColorEstado = (estado: EstadoAlertaTR): string => {
    switch (estado) {
      case 'VENCIDO':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PROXIMO':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'OK':
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getIconoEstado = (estado: EstadoAlertaTR): string => {
    switch (estado) {
      case 'VENCIDO':
        return '⚠️';
      case 'PROXIMO':
        return '⏰';
      case 'OK':
        return '✅';
    }
  };

  const filtrarPorEstado = <T extends { estado: EstadoAlertaTR }>(alertas: T[]): T[] => {
    if (filtroEstado === 'TODOS') return alertas;
    return alertas.filter(a => a.estado === filtroEstado);
  };

  const ordenarPorUrgencia = <T extends { estado: EstadoAlertaTR; kmRestantes?: number }>(
    alertas: T[]
  ): T[] => {
    const prioridad: Record<EstadoAlertaTR, number> = {
      VENCIDO: 0,
      PROXIMO: 1,
      OK: 2,
    };
    return [...alertas].sort((a, b) => {
      if (prioridad[a.estado] !== prioridad[b.estado]) {
        return prioridad[a.estado] - prioridad[b.estado];
      }
      return (a.kmRestantes || 0) - (b.kmRestantes || 0);
    });
  };

  const handleGenerarOT40K = (alerta: AlertaInspeccionLigera) => {
    if (onGenerarOT) {
      onGenerarOT({
        unidadNumero: alerta.unidadNumero,
        tipo: '40K',
        kilometrajeActual: alerta.kilometrajeActual,
        kilometrajeProximo: alerta.kilometrajeProximoMant,
        fechaUltimoMant: alerta.fechaUltimoMant,
        estado: alerta.estado,
      });
    }
  };

  const handleGenerarOTMant = (alerta: AlertaMantenimientoTR) => {
    if (onGenerarOT) {
      onGenerarOT({
        unidadNumero: alerta.unidadNumero,
        tipo: alerta.cicloActual,
        kilometrajeActual: alerta.kilometrajeActual,
        kilometrajeProximo: alerta.kilometrajeProximoMant,
        fechaUltimoMant: alerta.fechaUltimoMant,
        estado: alerta.estado,
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <span className="text-4xl mb-2 block">⚠️</span>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={cargarAlertas}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Vista compacta para dashboard
  if (compacto) {
    const alertasUrgentes = [
      ...alertasInspLig.filter(a => a.estado !== 'OK'),
      ...alertasMant.filter(a => a.estado !== 'OK'),
    ];

    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            🚛 Tren Rodante VRAC
          </h3>
          <div className="flex gap-2">
            {resumen.vencidos > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {resumen.vencidos} vencidos
              </span>
            )}
            {resumen.proximos > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                {resumen.proximos} próximos
              </span>
            )}
          </div>
        </div>

        {alertasUrgentes.length === 0 ? (
          <p className="text-green-600 text-sm">✅ Todas las unidades al día</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ordenarPorUrgencia(alertasUrgentes).slice(0, 5).map(alerta => (
              <div
                key={alerta.id}
                className={`p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${getColorEstado(alerta.estado)}`}
                onClick={() => onSeleccionarUnidad?.(alerta.unidadNumero, alerta.tipo)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {getIconoEstado(alerta.estado)} Unidad {alerta.unidadNumero}
                  </span>
                  <span className="text-xs font-bold">{alerta.tipo}</span>
                </div>
                <div className="text-xs mt-1">
                  {alerta.kmRestantes !== undefined && alerta.kmRestantes <= 0
                    ? `Vencido por ${formatearKm(Math.abs(alerta.kmRestantes))}`
                    : `Faltan ${formatearKm(alerta.kmRestantes || 0)}`}
                </div>
              </div>
            ))}
            {alertasUrgentes.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                +{alertasUrgentes.length - 5} alertas más
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Vista completa
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🚛 Mantenimiento Tren Rodante VRAC
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Control de mantenimiento de semirremolques cisterna
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{resumen.totalUnidades}</div>
          <div className="text-xs text-gray-500">Unidades</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{resumen.vencidos}</div>
          <div className="text-xs text-gray-500">Vencidos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{resumen.proximos}</div>
          <div className="text-xs text-gray-500">Próximos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{resumen.ok}</div>
          <div className="text-xs text-gray-500">OK</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTabActiva('40K')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            tabActiva === '40K'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Inspección Ligera (40K)
          <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded-full text-xs">
            {alertasInspLig.length}
          </span>
        </button>
        <button
          onClick={() => setTabActiva('80K-160K')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            tabActiva === '80K-160K'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Mantenimiento (80K/160K)
          <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded-full text-xs">
            {alertasMant.length}
          </span>
        </button>
      </div>

      {/* Filtros */}
      <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
        <span className="text-sm text-gray-600">Filtrar:</span>
        <div className="flex gap-2">
          {(['TODOS', 'VENCIDO', 'PROXIMO', 'OK'] as const).map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filtroEstado === estado
                  ? estado === 'TODOS'
                    ? 'bg-gray-800 text-white'
                    : estado === 'VENCIDO'
                    ? 'bg-red-500 text-white'
                    : estado === 'PROXIMO'
                    ? 'bg-amber-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {estado === 'TODOS' ? 'Todos' : estado.charAt(0) + estado.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          onClick={cargarAlertas}
          className="ml-auto p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Actualizar"
        >
          🔄
        </button>
      </div>

      {/* Lista de alertas */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {tabActiva === '40K' ? (
          <div className="space-y-3">
            {ordenarPorUrgencia(filtrarPorEstado(alertasInspLig)).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay alertas con el filtro seleccionado
              </p>
            ) : (
              ordenarPorUrgencia(filtrarPorEstado(alertasInspLig)).map(alerta => (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-lg border-2 ${getColorEstado(alerta.estado)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getIconoEstado(alerta.estado)}</span>
                      <div>
                        <h4 className="font-bold text-lg">Unidad {alerta.unidadNumero}</h4>
                        <p className="text-sm opacity-80">
                          Último: {formatearFecha(alerta.fechaUltimoMant)} • {formatearKm(alerta.kilometrajeActual)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-white/50 rounded-full text-sm font-bold">
                        40K
                      </span>
                      <p className="text-sm mt-1 font-medium">
                        {alerta.kmRestantes !== undefined && alerta.kmRestantes <= 0
                          ? `Vencido: ${formatearKm(Math.abs(alerta.kmRestantes))}`
                          : `Próximo: ${formatearKm(alerta.kilometrajeProximoMant)}`}
                      </p>
                    </div>
                  </div>
                  {alerta.estado !== 'OK' && onGenerarOT && (
                    <button
                      onClick={() => handleGenerarOT40K(alerta)}
                      className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      📝 Generar Orden de Trabajo
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {ordenarPorUrgencia(filtrarPorEstado(alertasMant)).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay alertas con el filtro seleccionado
              </p>
            ) : (
              ordenarPorUrgencia(filtrarPorEstado(alertasMant)).map(alerta => (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-lg border-2 ${getColorEstado(alerta.estado)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getIconoEstado(alerta.estado)}</span>
                      <div>
                        <h4 className="font-bold text-lg">Unidad {alerta.unidadNumero}</h4>
                        <p className="text-sm opacity-80">
                          Último: {formatearFecha(alerta.fechaUltimoMant)} • {formatearKm(alerta.kilometrajeActual)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          alerta.cicloActual === '160K'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alerta.cicloActual}
                      </span>
                      <p className="text-sm mt-1 font-medium">
                        {alerta.kmRestantes !== undefined && alerta.kmRestantes <= 0
                          ? `Vencido: ${formatearKm(Math.abs(alerta.kmRestantes))}`
                          : `Próximo: ${formatearKm(alerta.kilometrajeProximoMant)}`}
                      </p>
                    </div>
                  </div>
                  {alerta.estado !== 'OK' && onGenerarOT && (
                    <button
                      onClick={() => handleGenerarOTMant(alerta)}
                      className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      📝 Generar Orden de Trabajo
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="p-4 bg-gray-50 border-t">
        <p className="text-xs text-gray-500 text-center">
          <strong>Ciclos independientes:</strong> 40K (Inspección) cada 40,000 km • 80K↔160K (Mantenimiento) alternados
        </p>
      </div>
    </div>
  );
};

export default AlertasTrenRodante;
