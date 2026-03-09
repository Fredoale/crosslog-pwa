import { useEffect, useRef, useState } from 'react';
// Mapa via API vanilla (sin contexto de LoadScript)
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Punto { lat: number; lng: number; speed: number; timestamp: Date }

interface ViajeResumen {
  unidad: string;
  patente: string;
  chofer: string;
  sector: string;
  hdr?: string | null;
  fechaInicio: Date;
  fechaFin?: Date | null;
  kmRecorridos?: number | null;
  baseNombre?: string | null;
  estado: string;
}

interface Props {
  viaje: ViajeResumen;
  onClose: () => void;
}

const SECTOR_COLORS: Record<string, string> = {
  distribucion: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  vrac: 'bg-green-500/20 text-green-300 border-green-500/40',
  vital_aire: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
};
const SECTOR_LABELS: Record<string, string> = {
  distribucion: 'DIST', vrac: 'VRAC', vital_aire: 'VITAL',
};

// ── Douglas-Peucker — simplifica la ruta eliminando puntos redundantes ──────
function perpendicularDist(p: Punto, a: Punto, b: Punto): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const cosLat = Math.cos(toRad((a.lat + b.lat) / 2));
  const px = (p.lng - a.lng) * cosLat * R * Math.PI / 180;
  const py = (p.lat - a.lat) * R * Math.PI / 180;
  const dx = (b.lng - a.lng) * cosLat * R * Math.PI / 180;
  const dy = (b.lat - a.lat) * R * Math.PI / 180;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  return Math.sqrt(Math.pow(px - t * dx, 2) + Math.pow(py - t * dy, 2));
}

function douglasPeucker(pts: Punto[], epsilon: number): Punto[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left  = douglasPeucker(pts.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[pts.length - 1]];
}

function speedColor(s: number) {
  if (s <= 60) return '#22c55e';
  if (s <= 90) return '#f59e0b';
  return '#ef4444';
}

export default function MapaViajeModal({ viaje, onClose }: Props) {
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(() => !!(window as any).google?.maps);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Esperar a que Google Maps esté disponible (ya cargado por PanelFlota u otro)
  useEffect(() => {
    if ((window as any).google?.maps) { setMapsReady(true); return; }
    const interval = setInterval(() => {
      if ((window as any).google?.maps) { setMapsReady(true); clearInterval(interval); }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Inicializar mapa vanilla cuando esté listo y haya puntos
  useEffect(() => {
    if (!mapsReady || loading || puntos.length === 0 || !mapDivRef.current) return;

    const google = (window as any).google;
    const center = { lat: puntos[Math.floor(puntos.length / 2)].lat, lng: puntos[Math.floor(puntos.length / 2)].lng };

    const map = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: 13,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    // Polyline segmentada por velocidad
    for (let i = 0; i < puntos.length - 1; i++) {
      new google.maps.Polyline({
        path: [
          { lat: puntos[i].lat,     lng: puntos[i].lng },
          { lat: puntos[i+1].lat,   lng: puntos[i+1].lng },
        ],
        strokeColor:   speedColor(puntos[i].speed),
        strokeWeight:  4,
        strokeOpacity: 0.85,
        map,
      });
    }

    // Marcador inicio
    new google.maps.Marker({
      position: { lat: puntos[0].lat, lng: puntos[0].lng },
      map,
      label: { text: 'A', color: 'white', fontWeight: 'bold', fontSize: '11px' },
      title: `Inicio: ${formatFechaCorta(puntos[0].timestamp)}`,
    });

    // Marcador fin
    new google.maps.Marker({
      position: { lat: puntos[puntos.length-1].lat, lng: puntos[puntos.length-1].lng },
      map,
      label: { text: 'B', color: 'white', fontWeight: 'bold', fontSize: '11px' },
      title: `Fin: ${formatFechaCorta(puntos[puntos.length-1].timestamp)}`,
    });

    // Ajustar bounds para mostrar toda la ruta
    const bounds = new google.maps.LatLngBounds();
    puntos.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
  }, [mapsReady, loading, puntos]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const docId = `INT-${viaje.unidad}`;
        const inicio = Timestamp.fromDate(viaje.fechaInicio);
        const fin = viaje.fechaFin
          ? Timestamp.fromDate(viaje.fechaFin)
          : Timestamp.fromDate(new Date());

        const snap = await getDocs(
          query(
            collection(db, 'ubicaciones', docId, 'historial'),
            where('timestamp', '>=', inicio),
            where('timestamp', '<=', fin),
            orderBy('timestamp', 'asc')
          )
        );
        const pts: Punto[] = snap.docs.map(d => ({
          lat: d.data().lat as number,
          lng: d.data().lng as number,
          speed: (d.data().speed as number) ?? 0,
          timestamp: d.data().timestamp?.toDate() ?? new Date(),
        }));
        // Douglas-Peucker: elimina puntos redundantes manteniendo la forma de la ruta
        // epsilon = 8 metros (puntos dentro de 8m de la línea entre vecinos se eliminan)
        const simplified = pts.length > 10 ? douglasPeucker(pts, 8) : pts;
        console.log(`[MapaViaje] ${pts.length} puntos → ${simplified.length} tras Douglas-Peucker`);
        setPuntos(simplified);
      } catch (e) {
        console.error('[MapaViaje] Error:', e);
        setError('Error al cargar la ruta');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [viaje]);

  const center = puntos.length > 0
    ? { lat: puntos[Math.floor(puntos.length / 2)].lat, lng: puntos[Math.floor(puntos.length / 2)].lng }
    : { lat: -34.36, lng: -59.01 };

  const duracion = viaje.fechaFin
    ? (() => {
        const diff = viaje.fechaFin.getTime() - viaje.fechaInicio.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : 'En curso';

  const formatFechaCorta = (d: Date) => {
    const dia = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
    return `${dia} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const sectorColor = SECTOR_COLORS[viaje.sector] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  const sectorLabel = SECTOR_LABELS[viaje.sector] ?? viaje.sector.toUpperCase();
  const velMax = puntos.length > 0 ? Math.max(...puntos.map(p => p.speed)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-700 overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Fila 1: unidad + sector + estado */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-base">INT-{viaje.unidad}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sectorColor}`}>
                  {sectorLabel}
                </span>
                {viaje.estado === 'completado' && <span className="text-green-400 text-xs">✅ completado</span>}
                {viaje.estado === 'en_curso'   && <span className="text-yellow-400 text-xs">🔄 en curso</span>}
                {viaje.estado === 'interrumpido' && <span className="text-orange-400 text-xs">⚠️ interrumpido</span>}
              </div>
              {/* Fila 2: chofer + HDR */}
              <p className="text-sm text-gray-300 mt-0.5">
                {viaje.chofer}
                {viaje.hdr && <span className="ml-2 text-blue-400 text-xs">📋 HDR {viaje.hdr}</span>}
              </p>
              {/* Fila 3: fechas + métricas */}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatFechaCorta(viaje.fechaInicio)}
                {viaje.fechaFin && <> → {formatFechaCorta(viaje.fechaFin)}</>}
                <span className="text-gray-500 ml-1">({duracion})</span>
                {viaje.kmRecorridos != null && <span className="ml-2">· 📏 {viaje.kmRecorridos} km</span>}
                {velMax > 0 && <span className="ml-2">· {velMax.toFixed(0)} km/h máx</span>}
                {viaje.baseNombre && <span className="ml-2">· {viaje.baseNombre}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div className="relative" style={{ height: '380px' }}>
          {/* Overlay de carga */}
          {(loading || !mapsReady) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
              <div className="text-center text-gray-400">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p className="text-sm">Cargando ruta...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {!loading && mapsReady && puntos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
              <div className="text-center text-gray-400">
                <p className="text-2xl mb-2">🗺️</p>
                <p className="text-sm">Sin puntos GPS para este viaje</p>
                <p className="text-xs text-gray-500 mt-1">El historial requiere el nuevo APK</p>
              </div>
            </div>
          )}
          {/* Div donde Google Maps renderiza vía API vanilla */}
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Leyenda velocidad */}
        {!loading && puntos.length > 0 && (
          <div className="flex-shrink-0 bg-gray-800/80 border-t border-gray-700 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-green-500 inline-block" /> ≤60 km/h</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" /> 60–90 km/h</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-red-500 inline-block" /> &gt;90 km/h</span>
            <span className="ml-auto">{puntos.length} puntos GPS</span>
            <span className="text-gray-600">· simplificado</span>
          </div>
        )}
      </div>
    </div>
  );
}
