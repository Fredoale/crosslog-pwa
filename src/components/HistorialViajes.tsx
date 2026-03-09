import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import MapaViajeModal from './MapaViajeModal';
import { db } from '../config/firebase';
import { buscarTarifa } from '../utils/tarifas';

interface ViajeRegistro {
  id: string;
  unidad: string;
  patente: string;
  chofer: string;
  sector: string;
  hdr?: string | null;
  fechaInicio: Date;
  fechaFin?: Date | null;
  kmRecorridos?: number | null;
  baseNombre?: string | null;
  checklistId: string;
  estado: string;
}

interface Filtros {
  fechaDesde: string;
  fechaHasta: string;
  sector: string;
  unidad: string;
  chofer: string;
  hdr: string;
  tarifa: string;
}

interface HistorialViajesProps {
  onClose: () => void;
}

const SECTOR_LABELS: Record<string, string> = {
  distribucion: 'DIST',
  vrac: 'VRAC',
  vital_aire: 'VITAL',
};

const SECTOR_COLORS: Record<string, string> = {
  distribucion: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  vrac: 'bg-green-500/20 text-green-300 border-green-500/40',
  vital_aire: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
};

const ESTADO_BADGE: Record<string, string> = {
  completado: '✅',
  en_curso: '🔄',
  interrumpido: '⚠️',
};

function formatFecha(d: Date): string {
  const dia = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${dd}/${mm} ${hh}:${min}`;
}

function formatDuracion(inicio: Date, fin: Date): string {
  const diff = fin.getTime() - inicio.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function HistorialViajes({ onClose }: HistorialViajesProps) {
  const [viajes, setViajes] = useState<ViajeRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [viajeMapaAbierto, setViajeMapaAbierto] = useState<ViajeRegistro | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    fechaDesde: '',
    fechaHasta: '',
    sector: '',
    unidad: '',
    chofer: '',
    hdr: '',
    tarifa: '',
  });

  const cargarViajes = async () => {
    setLoading(true);
    setBuscado(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let constraints: any[] = [orderBy('fechaInicio', 'desc'), limit(200)];

      if (filtros.sector)    constraints = [where('sector', '==', filtros.sector),    ...constraints];
      if (filtros.unidad)    constraints = [where('unidad', '==', filtros.unidad),    ...constraints];
      if (filtros.chofer)    constraints = [where('chofer', '==', filtros.chofer.toUpperCase()), ...constraints];
      if (filtros.fechaDesde) {
        constraints = [where('fechaInicio', '>=', new Date(filtros.fechaDesde)), ...constraints];
      }
      if (filtros.fechaHasta) {
        constraints = [where('fechaInicio', '<=', new Date(filtros.fechaHasta + 'T23:59:59')), ...constraints];
      }

      const snap = await getDocs(query(collection(db, 'viajes'), ...constraints));
      let resultado: ViajeRegistro[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          unidad: data.unidad ?? '',
          patente: data.patente ?? '',
          chofer: data.chofer ?? '',
          sector: data.sector ?? '',
          hdr: data.hdr ?? null,
          fechaInicio: (data.fechaInicio as Timestamp)?.toDate() ?? new Date(0),
          fechaFin: (data.fechaFin as Timestamp)?.toDate() ?? null,
          kmRecorridos: data.kmRecorridos ?? null,
          baseNombre: data.baseNombre ?? null,
          checklistId: data.checklistId ?? '',
          estado: data.estado ?? '',
        };
      });

      // Filtros en cliente (evitan índice compuesto en Firestore)
      if (filtros.hdr)    resultado = resultado.filter(v => v.hdr?.toLowerCase().includes(filtros.hdr.toLowerCase()));
      if (filtros.tarifa) {
        resultado = resultado.filter(v => {
          if (!v.kmRecorridos) return false;
          const t = buscarTarifa(v.kmRecorridos);
          return t?.ruta.toLowerCase().includes(filtros.tarifa.toLowerCase()) ?? false;
        });
      }

      setViajes(resultado);
    } catch (err) {
      console.error('Error cargando viajes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => { cargarViajes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportarCSV = (v: ViajeRegistro) => {
    const tarifa = v.kmRecorridos != null ? buscarTarifa(v.kmRecorridos) : null;
    const SEP = ';';
    const row = [
      v.unidad, v.patente, v.chofer, v.sector.toUpperCase(),
      v.hdr ?? '', tarifa?.ruta ?? '', tarifa?.cliente ?? '',
      formatFecha(v.fechaInicio),
      v.fechaFin ? formatFecha(v.fechaFin) : '',
      v.kmRecorridos ?? '', v.baseNombre ?? '', v.estado,
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(SEP);
    const csv = `sep=${SEP}\nUnidad${SEP}Patente${SEP}Chofer${SEP}Sector${SEP}HDR${SEP}Tarifa${SEP}Cliente${SEP}Inicio${SEP}Fin${SEP}Km${SEP}Base${SEP}Estado\n${row}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const fecha = v.fechaInicio.toLocaleDateString('en-CA');
    a.download = `viaje_INT${v.unidad}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const eliminarViaje = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'viajes', id));
      setViajes(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Error eliminando viaje:', err);
    } finally {
      setConfirmandoEliminar(null);
    }
  };

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-lg font-bold text-white">🗺️ Viajes y Rutas</h1>
      </div>

      {/* Filtros */}
      <div className="flex-shrink-0 bg-gray-800/60 border-b border-gray-700 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={e => handleFiltroChange('fechaDesde', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={e => handleFiltroChange('fechaHasta', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Sector</label>
            <select
              value={filtros.sector}
              onChange={e => handleFiltroChange('sector', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="distribucion">DISTRIBUCIÓN</option>
              <option value="vrac">VRAC</option>
              <option value="vital_aire">VITAL AIRE</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Unidad</label>
            <input
              type="text"
              placeholder="ej: 41"
              value={filtros.unidad}
              onChange={e => handleFiltroChange('unidad', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Chofer</label>
            <input
              type="text"
              placeholder="ej: NOVALVA"
              value={filtros.chofer}
              onChange={e => handleFiltroChange('chofer', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">HDR (solo DIST)</label>
            <input
              type="text"
              placeholder="ej: 7472734"
              value={filtros.hdr}
              onChange={e => handleFiltroChange('hdr', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Tarifa (solo DIST)</label>
            <input
              type="text"
              placeholder="ej: Baradero"
              value={filtros.tarifa}
              onChange={e => handleFiltroChange('tarifa', e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={cargarViajes}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
            >
              {loading ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de viajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p>Cargando viajes...</p>
          </div>
        )}

        {!loading && buscado && viajes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="font-medium">No se encontraron viajes</p>
            <p className="text-sm mt-1">Ajustá los filtros e intentá de nuevo</p>
          </div>
        )}

        {!loading && viajes.map(v => {
          const tarifa = v.kmRecorridos != null ? buscarTarifa(v.kmRecorridos) : null;
          const sectorColor = SECTOR_COLORS[v.sector] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40';
          const sectorLabel = SECTOR_LABELS[v.sector] ?? v.sector.toUpperCase();
          const estadoBadge = ESTADO_BADGE[v.estado] ?? '';

          return (
            <div
              key={v.id}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-gray-600 transition-colors"
            >
              {/* Fila 1 (principal): unidad · sector · chofer · HDR ── estado + acciones */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-white font-bold text-sm">INT-{v.unidad}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sectorColor}`}>
                    {sectorLabel}
                  </span>
                  <span className="text-gray-300 text-xs truncate">{v.chofer}</span>
                  {v.hdr && <span className="text-blue-400 text-xs">· HDR {v.hdr}</span>}
                  <span className="text-xs text-gray-400">
                    {v.estado === 'completado'   && <>· Viaje completado {estadoBadge}</>}
                    {v.estado === 'en_curso'      && <>· En curso {estadoBadge}</>}
                    {v.estado === 'interrumpido'  && <>· Interrumpido {estadoBadge}</>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViajeMapaAbierto(v)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                    title="Ver ruta en mapa"
                  >
                    🗺 Ruta
                  </button>
                  <button
                    onClick={() => exportarCSV(v)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                    title="Exportar CSV"
                  >
                    ↓ CSV
                  </button>
                  {confirmandoEliminar === v.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => eliminarViaje(v.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmandoEliminar(null)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoEliminar(v.id)}
                      className="inline-flex items-center justify-center w-7 h-7 bg-gray-700 hover:bg-red-600/80 text-gray-400 hover:text-white text-sm rounded-lg transition-colors flex-shrink-0"
                      title="Eliminar viaje"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Fila 2 (secundaria): fecha · duración · km · base · tarifa */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-gray-400">
                <span>{formatFecha(v.fechaInicio)}</span>
                {v.fechaFin ? (
                  <>
                    <span className="text-gray-600">→</span>
                    <span>{formatFecha(v.fechaFin)}</span>
                    <span className="text-gray-500">({formatDuracion(v.fechaInicio, v.fechaFin)})</span>
                  </>
                ) : (
                  <span className="text-yellow-400">· En curso</span>
                )}
                {v.kmRecorridos != null && <><span className="text-gray-600">·</span><span>📏 {v.kmRecorridos} km</span></>}
                {v.baseNombre && <><span className="text-gray-600">·</span><span>{v.baseNombre}</span></>}
                {v.sector === 'distribucion' && (
                  tarifa
                    ? <><span className="text-gray-600">·</span><span className="text-green-400">{tarifa.ruta} · {tarifa.cliente}</span></>
                    : <><span className="text-gray-600">·</span><span className="text-gray-500">Reparto</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer con contador */}
      {!loading && buscado && viajes.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-700 px-4 py-2 text-xs text-gray-500 text-center">
          {viajes.length} viaje{viajes.length !== 1 ? 's' : ''} encontrado{viajes.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Modal mapa de ruta */}
      {viajeMapaAbierto && (
        <MapaViajeModal
          viaje={viajeMapaAbierto}
          onClose={() => setViajeMapaAbierto(null)}
        />
      )}
    </div>
  );
}
