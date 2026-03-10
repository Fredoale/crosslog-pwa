/**
 * ALERTAS DE MANTENIMIENTO
 * Panel de alertas de service por kilómetros
 * Usado en DashboardMantenimiento y DashboardTaller
 */

import React, { useState, useEffect } from 'react';
import {
  getAlertasMantenimiento,
  type AlertaMantenimiento,
  type EstadoAlerta,
  type SectorAlerta,
} from '../../services/alertasMantenimientoService';

// ============================================================================
// HELPERS
// ============================================================================

function formatKm(km: number | null): string {
  if (km === null) return '—';
  return km.toLocaleString('es-AR');
}

function formatFecha(fecha: Date | null): string {
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function estadoConfig(estado: EstadoAlerta) {
  switch (estado) {
    case 'vencido':
      return {
        badge: 'bg-red-100 text-red-700 border border-red-200',
        dot: 'bg-red-500 animate-pulse',
        borde: 'border-t-red-500',
        texto: 'VENCIDO',
        kmColor: 'text-red-600 font-bold',
        barColor: 'bg-red-500',
        label: (km: number) => `VENCIDO +${Math.abs(km).toLocaleString('es-AR')} km`,
        labelColor: 'text-red-600',
      };
    case 'urgente':
      return {
        badge: 'bg-orange-100 text-orange-700 border border-orange-200',
        dot: 'bg-orange-500 animate-pulse',
        borde: 'border-t-orange-500',
        texto: 'URGENTE',
        kmColor: 'text-orange-600 font-bold',
        barColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
        label: (km: number) => `Faltan ${km.toLocaleString('es-AR')} km`,
        labelColor: 'text-orange-600',
      };
    case 'atencion':
      return {
        badge: 'bg-amber-100 text-amber-700 border border-amber-200',
        dot: 'bg-amber-400',
        borde: 'border-t-amber-400',
        texto: 'ATENCIÓN',
        kmColor: 'text-amber-600 font-bold',
        barColor: 'bg-amber-400',
        label: (km: number) => `Faltan ${km.toLocaleString('es-AR')} km`,
        labelColor: 'text-amber-600',
      };
    default:
      return {
        badge: 'bg-[#f0f9e8] text-[#56ab2f] border border-[#a8e063]',
        dot: 'bg-[#56ab2f]',
        borde: 'border-t-[#56ab2f]',
        texto: 'AL DÍA',
        kmColor: 'text-[#56ab2f] font-bold',
        barColor: 'bg-[#56ab2f]',
        label: (km: number) => `Faltan ${km.toLocaleString('es-AR')} km`,
        labelColor: 'text-[#56ab2f]',
      };
  }
}

function sectorLabel(sector: SectorAlerta): string {
  switch (sector) {
    case 'VRAC': return 'VRAC';
    case 'DIST': return 'DIST';
    case 'VA':   return 'V.AIRE';
  }
}

// ============================================================================
// PROPS
// ============================================================================

interface AlertasMantenimientoProps {
  /** 'coordinador' muestra cards + filtros; 'taller' muestra tabla compacta */
  modo?: 'coordinador' | 'taller';
  onGenerarOT?: (alerta: AlertaMantenimiento) => void;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function AlertasMantenimiento({
  modo = 'coordinador',
  onGenerarOT,
}: AlertasMantenimientoProps) {
  const [alertas, setAlertas] = useState<AlertaMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoAlerta | 'todas'>('todas');
  const [filtroSector, setFiltroSector] = useState<SectorAlerta | 'todos'>('todos');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    getAlertasMantenimiento().then((data) => {
      if (!cancelado) {
        setAlertas(data);
        setLoading(false);
      }
    });
    return () => { cancelado = true; };
  }, []);

  const alertasFiltradas = alertas.filter((a) => {
    const estadoOk = filtro === 'todas' || a.estado === filtro;
    const sectorOk = filtroSector === 'todos' || a.unidad.sector === filtroSector;
    return estadoOk && sectorOk;
  });

  const counts = {
    todas:    alertas.length,
    vencido:  alertas.filter((a) => a.estado === 'vencido').length,
    urgente:  alertas.filter((a) => a.estado === 'urgente').length,
    atencion: alertas.filter((a) => a.estado === 'atencion').length,
    ok:       alertas.filter((a) => a.estado === 'ok').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#56ab2f]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total unidades</div>
          <div className="text-3xl font-bold text-blue-600">{counts.todas}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-[#56ab2f] shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Al día</div>
          <div className="text-3xl font-bold text-[#56ab2f]">{counts.ok}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-amber-400 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Atención</div>
          <div className="text-3xl font-bold text-amber-500">{counts.atencion}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Urgente / Vencido</div>
          <div className="text-3xl font-bold text-red-600">{counts.urgente + counts.vencido}</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        {/* Filtro estado */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-gray-500 mr-1">Filtrar:</span>
          {(['todas', 'vencido', 'urgente', 'atencion', 'ok'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filtro === f
                  ? f === 'todas'    ? 'bg-[#1a2332] border-[#1a2332] text-white'
                  : f === 'vencido'  ? 'bg-red-100 border-red-400 text-red-700'
                  : f === 'urgente'  ? 'bg-orange-100 border-orange-400 text-orange-700'
                  : f === 'atencion' ? 'bg-amber-100 border-amber-400 text-amber-700'
                  :                   'bg-[#f0f9e8] border-[#56ab2f] text-[#56ab2f]'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f === 'todas' ? `Todas (${counts.todas})`
               : f === 'vencido'  ? `🔴 Venc. (${counts.vencido})`
               : f === 'urgente'  ? `🟠 Urg. (${counts.urgente})`
               : f === 'atencion' ? `🟡 Atenc. (${counts.atencion})`
               :                    `🟢 Ok (${counts.ok})`}
            </button>
          ))}
        </div>
        {/* Filtro sector */}
        <div className="flex gap-1.5 sm:ml-auto">
          {(['todos', 'VRAC', 'DIST', 'VA'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroSector(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filtroSector === s
                  ? 'bg-[#1a2332] border-[#1a2332] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s === 'todos' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      {/* MODO COORDINADOR — CARDS */}
      {modo === 'coordinador' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alertasFiltradas.map((alerta) => {
            const cfg = estadoConfig(alerta.estado);
            return (
              <div
                key={alerta.unidad.numero}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow border-t-4 ${cfg.borde}`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-xl">
                      {alerta.unidad.tipo === 'Camioneta' ? '🚐' : '🚛'}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-base">INT-{alerta.unidad.numero}</div>
                      <div className="text-xs text-gray-500 font-medium">
                        {alerta.unidad.marca} · c/{alerta.unidad.intervaloKm.toLocaleString('es-AR')} km
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-gray-100 text-gray-500 border border-gray-200">
                      {sectorLabel(alerta.unidad.sector)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${cfg.dot}`}></span>
                      {cfg.texto}
                    </span>
                  </div>
                </div>

                {/* KM Data */}
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">KM Actual</div>
                    <div className={`text-sm font-bold tabular-nums ${
                      alerta.estado === 'ok' ? 'text-gray-800' : cfg.kmColor
                    }`}>
                      {formatKm(alerta.kmActual)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Últ. Service</div>
                    <div className="text-sm font-bold tabular-nums text-gray-700">
                      {formatKm(alerta.kmUltimoService)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Próx. Service</div>
                    <div className={`text-sm font-bold tabular-nums ${cfg.kmColor}`}>
                      {formatKm(alerta.kmProximoService)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Progreso</span>
                    <span className={`text-[11px] font-bold ${cfg.labelColor}`}>
                      {alerta.kmFaltantes !== null
                        ? cfg.label(alerta.kmFaltantes)
                        : 'Sin datos de service'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cfg.barColor}`}
                      style={{ width: `${Math.min(100, alerta.porcentaje ?? 0)}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Últ. service:{' '}
                    <span className="text-gray-600 font-medium">{formatFecha(alerta.fechaUltimoService)}</span>
                  </div>
                  {onGenerarOT && alerta.estado !== 'ok' && (
                    <button
                      onClick={() => onGenerarOT(alerta)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        alerta.estado === 'vencido' || alerta.estado === 'urgente'
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] hover:opacity-90 text-white'
                      }`}
                    >
                      {alerta.estado === 'vencido' || alerta.estado === 'urgente'
                        ? 'Generar OT'
                        : 'Programar OT'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {alertasFiltradas.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">✅</div>
              <div className="font-semibold">No hay alertas con ese filtro</div>
            </div>
          )}
        </div>
      )}

      {/* MODO TALLER — CARDS en mobile, TABLA en desktop */}
      {modo === 'taller' && (
        <>
          {/* MOBILE: cards compactas */}
          <div className="sm:hidden space-y-2">
            {alertasFiltradas.map((alerta) => {
              const cfg = estadoConfig(alerta.estado);
              const borderColor =
                alerta.estado === 'vencido'  ? 'border-l-red-500'
                : alerta.estado === 'urgente'  ? 'border-l-orange-500'
                : alerta.estado === 'atencion' ? 'border-l-amber-400'
                :                               'border-l-[#56ab2f]';
              return (
                <div
                  key={alerta.unidad.numero}
                  className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} shadow-sm p-3 ${alerta.estado === 'ok' ? 'opacity-70' : ''}`}
                >
                  {/* Fila 1: Unidad + Estado */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">INT-{alerta.unidad.numero}</span>
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                        {sectorLabel(alerta.unidad.sector)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                      {cfg.texto}
                    </span>
                  </div>
                  {/* Fila 2: KM datos */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">KM Actual</div>
                      <div className={`text-xs font-bold tabular-nums ${alerta.estado !== 'ok' ? cfg.kmColor : 'text-gray-700'}`}>
                        {formatKm(alerta.kmActual)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Últ. Service</div>
                      <div className="text-xs font-semibold tabular-nums text-gray-600">
                        {formatKm(alerta.kmUltimoService)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Faltan</div>
                      <div className={`text-xs font-bold tabular-nums ${cfg.kmColor}`}>
                        {alerta.kmFaltantes !== null
                          ? alerta.kmFaltantes < 0
                            ? `-${Math.abs(alerta.kmFaltantes).toLocaleString('es-AR')}`
                            : alerta.kmFaltantes.toLocaleString('es-AR')
                          : '—'}
                      </div>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Progreso</span>
                      <span className={`text-[10px] font-bold ${cfg.labelColor}`}>
                        {alerta.kmFaltantes !== null
                          ? cfg.label(alerta.kmFaltantes)
                          : 'Sin datos de service'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cfg.barColor}`}
                        style={{ width: `${Math.min(100, alerta.porcentaje ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Botón acción */}
                  {onGenerarOT && alerta.estado !== 'ok' && (
                    <button
                      onClick={() => onGenerarOT(alerta)}
                      className={`mt-2 w-full text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                        alerta.estado === 'vencido' || alerta.estado === 'urgente'
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white hover:opacity-90'
                      }`}
                    >
                      {alerta.estado === 'vencido' || alerta.estado === 'urgente' ? 'Generar OT' : 'Programar OT'}
                    </button>
                  )}
                </div>
              );
            })}
            {alertasFiltradas.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-semibold text-sm">No hay alertas con ese filtro</div>
              </div>
            )}
          </div>

          {/* DESKTOP: tabla compacta */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Unidad</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Marca / Sector</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">KM Actual</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">KM Últ. Service</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Próx. Service</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Faltan</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                    {onGenerarOT && (
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {alertasFiltradas.map((alerta) => {
                    const cfg = estadoConfig(alerta.estado);
                    const borderColor =
                      alerta.estado === 'vencido'  ? 'border-l-red-500'
                      : alerta.estado === 'urgente'  ? 'border-l-orange-500'
                      : alerta.estado === 'atencion' ? 'border-l-amber-400'
                      :                               'border-l-[#56ab2f]';
                    return (
                      <tr
                        key={alerta.unidad.numero}
                        className={`border-b border-gray-100 border-l-4 ${borderColor} hover:bg-gray-50 transition-colors ${
                          alerta.estado === 'ok' ? 'opacity-65' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-gray-900">INT-{alerta.unidad.numero}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{alerta.unidad.marca}</div>
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                            {sectorLabel(alerta.unidad.sector)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-semibold tabular-nums ${alerta.estado !== 'ok' ? cfg.kmColor : 'text-gray-700'}`}>
                          {formatKm(alerta.kmActual)} km
                        </td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {formatKm(alerta.kmUltimoService)} km
                        </td>
                        <td className={`px-4 py-3 font-semibold tabular-nums ${cfg.kmColor}`}>
                          {formatKm(alerta.kmProximoService)} km
                        </td>
                        <td className={`px-4 py-3 font-bold tabular-nums ${cfg.kmColor}`}>
                          {alerta.kmFaltantes !== null
                            ? alerta.kmFaltantes < 0
                              ? `-${Math.abs(alerta.kmFaltantes).toLocaleString('es-AR')} km`
                              : `${alerta.kmFaltantes.toLocaleString('es-AR')} km`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                            {cfg.texto}
                          </span>
                        </td>
                        {onGenerarOT && (
                          <td className="px-4 py-3">
                            {alerta.estado !== 'ok' && (
                              <button
                                onClick={() => onGenerarOT(alerta)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                  alerta.estado === 'vencido' || alerta.estado === 'urgente'
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white hover:opacity-90'
                                }`}
                              >
                                {alerta.estado === 'vencido' || alerta.estado === 'urgente'
                                  ? 'Generar OT'
                                  : 'Programar OT'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {alertasFiltradas.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-semibold text-sm">No hay alertas con ese filtro</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
