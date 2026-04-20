/**
 * TAB ALERTAS — Estado service + historial de fallas de batería + registro de nuevas fallas
 */

import React, { useState, useEffect } from 'react';
import {
  getBateriaActiva,
  getHistorialBaterias,
  registrarFallaBateria,
  calcularMesesUso,
  type RegistroBateria,
  type SintomaFalla,
  type DiagnosticoFalla,
} from '../../../services/bateriasService';
import { type AlertaMantenimiento } from '../../../services/alertasMantenimientoService';

interface Props {
  alerta: AlertaMantenimiento;
}

const SINTOMA_LABEL: Record<SintomaFalla, string> = {
  arranque_lento:  '🔄 Arranque lento',
  no_arranca:      '🚫 No arranca',
  descarga_rapida: '⚡ Descarga rápida',
  luz_tablero:     '💡 Luz de tablero',
  otro:            '❓ Otro',
};

const DIAGNOSTICO_LABEL: Record<DiagnosticoFalla, string> = {
  bateria:         '🔋 Falla de batería',
  electrico:       '⚡ Falla eléctrica (alternador/circuito)',
  sin_determinar:  '❓ Sin determinar',
};

function formatFecha(fecha: Date) {
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ============================================================================
// FORM REGISTRO FALLA
// ============================================================================

function FormFalla({
  bateriaId,
  onGuardado,
  onCancelar,
}: {
  bateriaId: string;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    sintoma: '' as SintomaFalla | '',
    diagnostico: '' as DiagnosticoFalla | '',
    descripcion: '',
    resolucion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sintoma || !form.diagnostico) {
      setError('Síntoma y diagnóstico son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      await registrarFallaBateria(bateriaId, {
        fecha: new Date(form.fecha + 'T12:00:00'),
        sintoma: form.sintoma as SintomaFalla,
        diagnostico: form.diagnostico as DiagnosticoFalla,
        descripcion: form.descripcion,
        resolucion: form.resolucion,
        registradoPor: 'sistema',
      });
      onGuardado();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
      <div className="text-sm font-bold text-gray-800">Registrar falla de batería</div>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha *</label>
          <input
            type="date"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Síntoma *</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f] bg-white"
            value={form.sintoma}
            onChange={(e) => setForm({ ...form, sintoma: e.target.value as SintomaFalla })}
          >
            <option value="">Seleccionar...</option>
            {Object.entries(SINTOMA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnóstico *</label>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.entries(DIAGNOSTICO_LABEL) as [DiagnosticoFalla, string][]).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm({ ...form, diagnostico: k })}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border text-left transition-colors ${
                form.diagnostico === k
                  ? k === 'electrico' ? 'bg-orange-100 border-orange-400 text-orange-700'
                  : k === 'bateria'   ? 'bg-red-100 border-red-400 text-red-700'
                  :                    'bg-gray-100 border-gray-400 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
        <textarea
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f] resize-none"
          rows={2}
          placeholder="Ej: Arrancó lento en frío. Voltaje alternador OK (14.2V)."
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolución</label>
        <input
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
          placeholder="Ej: Cambio de batería, carga de batería, revisión eléctrica..."
          value={form.resolucion}
          onChange={(e) => setForm({ ...form, resolucion: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Registrar falla'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function TabAlertas({ alerta }: Props) {
  const [bateria, setBateria] = useState<RegistroBateria | null>(null);
  const [historial, setHistorial] = useState<RegistroBateria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormFalla, setMostrarFormFalla] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getBateriaActiva(alerta.unidad.numero),
      getHistorialBaterias(alerta.unidad.numero),
    ]).then(([activa, hist]) => {
      setBateria(activa);
      setHistorial(hist);
      setLoading(false);
    });
  }, [alerta.unidad.numero]);

  function recargar() {
    setMostrarFormFalla(false);
    setLoading(true);
    Promise.all([
      getBateriaActiva(alerta.unidad.numero),
      getHistorialBaterias(alerta.unidad.numero),
    ]).then(([activa, hist]) => {
      setBateria(activa);
      setHistorial(hist);
      setLoading(false);
    });
  }

  // Calcular estado del service
  const estadoService = alerta.estado;
  const SERVICE_CONFIG = {
    vencido:  { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: '🔴', label: 'VENCIDO' },
    urgente:  { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '🟠', label: 'URGENTE' },
    atencion: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '🟡', label: 'ATENCIÓN' },
    ok:       { color: 'text-[#56ab2f]', bg: 'bg-[#f0f9e8] border-[#a8e063]', icon: '🟢', label: 'AL DÍA' },
  };
  const svcCfg = SERVICE_CONFIG[estadoService];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ALERTA SERVICE */}
      <div className={`rounded-xl border p-4 ${svcCfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${svcCfg.color}`}>
            {svcCfg.icon} Service {svcCfg.label}
          </span>
          {alerta.kmFaltantes !== null && (
            <span className={`text-xs font-bold ${svcCfg.color}`}>
              {alerta.kmFaltantes < 0
                ? `Vencido +${Math.abs(alerta.kmFaltantes).toLocaleString('es-AR')} km`
                : `Faltan ${alerta.kmFaltantes.toLocaleString('es-AR')} km`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">KM actual</div>
            <div className={`font-bold tabular-nums ${svcCfg.color}`}>
              {alerta.kmActual ? alerta.kmActual.toLocaleString('es-AR') + ' km' : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Últ. service</div>
            <div className="font-bold tabular-nums text-gray-700">
              {alerta.kmUltimoService ? alerta.kmUltimoService.toLocaleString('es-AR') + ' km' : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Próx. service</div>
            <div className={`font-bold tabular-nums ${svcCfg.color}`}>
              {alerta.kmProximoService ? alerta.kmProximoService.toLocaleString('es-AR') + ' km' : '—'}
            </div>
          </div>
        </div>
        {alerta.porcentaje !== null && (
          <div className="mt-3">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  estadoService === 'vencido' ? 'bg-red-500'
                  : estadoService === 'urgente' ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : estadoService === 'atencion' ? 'bg-amber-400'
                  : 'bg-[#56ab2f]'
                }`}
                style={{ width: `${Math.min(100, alerta.porcentaje)}%` }}
              />
            </div>
            <div className={`text-right text-[10px] font-bold mt-0.5 ${svcCfg.color}`}>
              {alerta.porcentaje}% recorrido
            </div>
          </div>
        )}
      </div>

      {/* FALLAS BATERÍA */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🔋 Fallas de batería</span>
          {bateria && !mostrarFormFalla && (
            <button
              onClick={() => setMostrarFormFalla(true)}
              className="text-xs font-semibold text-[#56ab2f] hover:underline"
            >
              + Registrar falla
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {mostrarFormFalla && bateria && (
            <FormFalla
              bateriaId={bateria.id}
              onGuardado={recargar}
              onCancelar={() => setMostrarFormFalla(false)}
            />
          )}

          {!bateria && (
            <div className="text-sm text-gray-400 text-center py-4">
              Sin batería registrada. Vé a la tab Ficha para registrar una.
            </div>
          )}

          {bateria && bateria.fallas.length === 0 && !mostrarFormFalla && (
            <div className="text-sm text-gray-400 text-center py-4">Sin fallas registradas ✅</div>
          )}

          {bateria && bateria.fallas.length > 0 && (
            <div className="space-y-2">
              {[...bateria.fallas].reverse().map((falla) => (
                <div
                  key={falla.id}
                  className={`rounded-lg border p-3 ${
                    falla.diagnostico === 'electrico'
                      ? 'bg-orange-50 border-orange-200'
                      : falla.diagnostico === 'bateria'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-800">
                      {SINTOMA_LABEL[falla.sintoma]}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatFecha(falla.fecha)}</span>
                  </div>
                  <div className={`text-xs font-semibold mb-1 ${
                    falla.diagnostico === 'electrico' ? 'text-orange-700'
                    : falla.diagnostico === 'bateria' ? 'text-red-700'
                    : 'text-gray-600'
                  }`}>
                    {DIAGNOSTICO_LABEL[falla.diagnostico]}
                  </div>
                  {falla.descripcion && (
                    <div className="text-xs text-gray-600">{falla.descripcion}</div>
                  )}
                  {falla.resolucion && (
                    <div className="text-xs text-gray-500 mt-1 italic">→ {falla.resolucion}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HISTORIAL BATERÍAS ANTERIORES */}
      {historial.filter((b) => !b.activa).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Baterías anteriores</span>
          </div>
          <div className="divide-y divide-gray-100">
            {historial.filter((b) => !b.activa).map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-700">
                    {b.marca} {b.modelo}
                  </div>
                  <div className="text-xs text-gray-400">
                    Instalada {formatFecha(b.fechaInstalacion)} · {calcularMesesUso(b.fechaInstalacion)} meses de uso
                    {b.fallas.length > 0 && ` · ${b.fallas.length} falla${b.fallas.length > 1 ? 's' : ''}`}
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                  Inactiva
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
