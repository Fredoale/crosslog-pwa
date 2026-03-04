import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';
import { collection, onSnapshot, query, doc, getDoc, setDoc, getDocs, orderBy, where, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { buscarTarifa } from '../utils/tarifas';
import HistorialViajes from './HistorialViajes';

// Tipos de filtro por sector
type FiltroSector = 'todos' | 'vrac' | 'distribucion' | 'vital_aire';

interface UbicacionUnidad {
  id: string;
  unidad: string;
  patente: string;
  chofer: string;
  lat: number;
  lng: number;
  activo: boolean;
  enBase: boolean;
  baseNombre?: string;
  timestamp: Date;
  sector?: 'vrac' | 'distribucion' | 'vital_aire' | null;
  hdr?: string | null;
  kmRecorridos?: number;
}

interface HistorialPunto {
  lat: number;
  lng: number;
  speed: number;
  timestamp: Date;
}

interface PanelFlotaProps {
  onClose: () => void;
}

// El mapa ocupará toda la pantalla
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Bases Crosslog
const BASES_CROSSLOG = [
  {
    id: 'los-cardales',
    lat: -34.36014566238795,
    lng: -59.00991328060013,
    nombre: 'Base Los Cardales',
    direccion: 'JXQR+W2P Los Cardales, Provincia de Buenos Aires'
  },
  {
    id: 'villa-maipu',
    lat: -34.56297844053954,
    lng: -58.52935080773911,
    nombre: 'Base Villa Maipú',
    direccion: 'Sta Marta 2475, Villa Maipú, Buenos Aires'
  }
];

// Centro del mapa (entre ambas bases)
const defaultCenter = {
  lat: -34.46,
  lng: -58.77,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Función para dispersar unidades en base (las posiciona a la derecha del marcador de base)
function dispersarPosicion(baseLat: number, baseLng: number, index: number, total: number): { lat: number; lng: number } {
  // Offset hacia la derecha del marcador de base (~50 metros)
  const offsetLng = 0.0006;
  // Dispersión vertical entre unidades (~20 metros entre cada una)
  const espacioVertical = 0.0002;

  // Calcular posición: a la derecha de la base, apiladas verticalmente
  const offsetVertical = (index - (total - 1) / 2) * espacioVertical;

  return {
    lat: baseLat + offsetVertical,
    lng: baseLng + offsetLng
  };
}


// Distancia entre dos coordenadas en km (Haversine)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Iconos SVG por sector — todos círculos, colores distintos
function vehiculoSVG(sector: string | null | undefined, activo: boolean): string {
  const op = activo ? '1' : '0.55';
  const color =
    sector === 'vrac'        ? '#3B82F6' :
    sector === 'distribucion' ? '#BFCE2A' :
    sector === 'vital_aire'  ? '#F97316' :
    '#6B7280';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2" opacity="${op}"/>
    <circle cx="12" cy="12" r="4" fill="#fff"/>
  </svg>`;
}

// Tamaño del ícono — igual para todos los sectores
function vehiculoIconSize(_sector: string | null | undefined): { w: number; h: number } {
  return { w: 35, h: 35 };
}

export function PanelFlota({ onClose }: PanelFlotaProps) {
  const [ubicaciones, setUbicaciones] = useState<UbicacionUnidad[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<UbicacionUnidad | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsHabilitado, setGpsHabilitado] = useState<boolean>(false);
  const [loadingGpsConfig, setLoadingGpsConfig] = useState(true);
  const [filtroSector, setFiltroSector] = useState<FiltroSector>('todos');
  const [showSidebar, setShowSidebar] = useState(false); // Panel izquierdo colapsable
  const [highlightedUnidad, setHighlightedUnidad] = useState<UbicacionUnidad | null>(null); // Unidad resaltada en sidebar
  const sidebarListRef = useRef<HTMLDivElement>(null); // Ref al contenedor de la lista del sidebar
  const prevUbicacionesRef = useRef<Map<string, UbicacionUnidad>>(new Map());
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialRuta, setHistorialRuta] = useState<HistorialPunto[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialUnidadId, setHistorialUnidadId] = useState<string | null>(null);
  const [historialCargado, setHistorialCargado] = useState(false);
  const [historialFecha, setHistorialFecha] = useState<string | null>(null);
  const [cargaCombustibleDia, setCargaCombustibleDia] = useState<{ litros: number; hora: string } | null | undefined>(undefined); // undefined=sin consultar, null=sin carga
  const [historialDesde, setHistorialDesde] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
    return toDatetimeLocal(d);
  });
  const [historialHasta, setHistorialHasta] = useState<string>(() => toDatetimeLocal(new Date()));
  const historialCancelRef = useRef(false);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const historialMarkersRef = useRef<google.maps.Marker[]>([]);
  const [tooltipPunto, setTooltipPunto] = useState<HistorialPunto | null>(null);

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  };

  // Handler para click en marcador: abre sidebar y resalta la unidad
  const handleMarkerClick = useCallback((unidad: UbicacionUnidad) => {
    setHighlightedUnidad(unidad);
    setShowSidebar(true);
    setSelectedUnidad(null);
    setHistorialRuta([]);
    setHistorialUnidadId(null);
    setHistorialCargado(false);
    setTooltipPunto(null);
  }, []);

  // Scroll al item resaltado cuando se abre el sidebar
  useEffect(() => {
    if (showSidebar && highlightedUnidad && sidebarListRef.current) {
      // Pequeño delay para que el panel termine de abrir antes de hacer scroll
      setTimeout(() => {
        const el = sidebarListRef.current?.querySelector(`[data-unidad-id="${highlightedUnidad.id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  }, [showSidebar, highlightedUnidad]);

  // Cargar historial del último recorrido para una unidad
  const cargarHistorial = async (docId: string) => {
    historialCancelRef.current = false;
    setLoadingHistorial(true);
    setHistorialRuta([]);
    setHistorialFecha(null);
    setHistorialUnidadId(docId);
    setHistorialCargado(false);
    try {
      // Paso 1: encontrar la fecha del punto más reciente
      const latestSnap = await getDocs(
        query(
          collection(db, 'ubicaciones', docId, 'historial'),
          orderBy('timestamp', 'desc'),
          limit(1)
        )
      );
      if (historialCancelRef.current) return;
      if (latestSnap.empty) {
        setHistorialCargado(true);
        return;
      }
      const ultimaFecha = latestSnap.docs[0].data().fecha as string;
      setHistorialFecha(ultimaFecha);

      // Paso 2: cargar todos los puntos de esa fecha
      const snap = await getDocs(
        query(
          collection(db, 'ubicaciones', docId, 'historial'),
          where('fecha', '==', ultimaFecha),
          orderBy('timestamp', 'asc')
        )
      );
      if (historialCancelRef.current) return;
      const puntos: HistorialPunto[] = snap.docs.map(d => ({
        lat: d.data().lat as number,
        lng: d.data().lng as number,
        speed: (d.data().speed as number) ?? 0,
        timestamp: d.data().timestamp?.toDate() ?? new Date(),
      }));
      setHistorialRuta(puntos);
      setHistorialCargado(true);

      // Buscar carga de combustible del mismo día
      try {
        const inicioDia = new Date(ultimaFecha + 'T00:00:00');
        const finDia    = new Date(ultimaFecha + 'T23:59:59');
        const cargasSnap = await getDocs(
          query(
            collection(db, 'cargas_combustible'),
            where('unidad.numero', '==', docId.replace('INT-', '')),
            where('fecha', '>=', inicioDia),
            where('fecha', '<=', finDia)
          )
        );
        if (!cargasSnap.empty) {
          let totalLitros = 0;
          let primeraHora = '';
          cargasSnap.docs.forEach(d => {
            totalLitros += d.data().litrosCargados ?? 0;
            if (!primeraHora) {
              const f: Date = d.data().fecha?.toDate?.() ?? new Date();
              primeraHora = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            }
          });
          setCargaCombustibleDia({ litros: totalLitros, hora: primeraHora });
        } else {
          setCargaCombustibleDia(null);
        }
      } catch (e) {
        console.warn('[Historial] Error cargando combustible:', e);
        setCargaCombustibleDia(null);
      }
    } catch (e) {
      if (historialCancelRef.current) return;
      console.error('[Historial] Error:', e);
      toast('Error al cargar el historial. Verificá la consola.', { duration: 4000 });
      setHistorialCargado(true);
    } finally {
      if (!historialCancelRef.current) setLoadingHistorial(false);
    }
  };

  // Cargar historial por rango fecha/hora (VRAC)
  const cargarHistorialRango = async (docId: string, desde: string, hasta: string) => {
    historialCancelRef.current = false;
    setLoadingHistorial(true);
    setHistorialRuta([]);
    setHistorialFecha(null);
    setHistorialUnidadId(docId);
    setHistorialCargado(false);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'ubicaciones', docId, 'historial'),
          where('timestamp', '>=', Timestamp.fromDate(new Date(desde))),
          where('timestamp', '<=', Timestamp.fromDate(new Date(hasta))),
          orderBy('timestamp', 'asc')
        )
      );
      if (historialCancelRef.current) return;
      const puntos: HistorialPunto[] = snap.docs.map(d => ({
        lat: d.data().lat as number,
        lng: d.data().lng as number,
        speed: (d.data().speed as number) ?? 0,
        timestamp: d.data().timestamp?.toDate() ?? new Date(),
      }));
      setHistorialRuta(puntos);
      setHistorialCargado(true);
    } catch (e) {
      if (historialCancelRef.current) return;
      console.error('[Historial Rango] Error:', e);
      toast('Error al cargar el historial.', { duration: 4000 });
      setHistorialCargado(true);
    } finally {
      if (!historialCancelRef.current) setLoadingHistorial(false);
    }
  };

  // Limpiar historial al cambiar de unidad seleccionada
  const limpiarHistorial = () => {
    historialCancelRef.current = true;
    setLoadingHistorial(false);
    setHistorialRuta([]);
    setHistorialUnidadId(null);
    setHistorialCargado(false);
    setHistorialFecha(null);
    setCargaCombustibleDia(undefined);
    setTooltipPunto(null);
  };

  // Color según velocidad
  const speedColor = (speed: number) => {
    if (speed <= 60) return '#22c55e';   // verde — seguro / detenido
    if (speed <= 80) return '#f59e0b';   // amarillo — precaución
    return '#ef4444';                    // rojo — exceso
  };

  // Polyline + marcadores de puntos + fitBounds — API directa de Google Maps
  useEffect(() => {
    if (!map) return;

    // Limpiar estado anterior
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    historialMarkersRef.current.forEach(m => m.setMap(null));
    historialMarkersRef.current = [];
    setTooltipPunto(null);

    if (historialRuta.length > 1) {
      // Polyline del recorrido
      polylineRef.current = new google.maps.Polyline({
        path: historialRuta.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: '#22c55e',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        zIndex: 5,
        map,
      });

      // Marcadores de puntos con color por velocidad
      const bounds = new google.maps.LatLngBounds();
      historialRuta.forEach(punto => {
        bounds.extend({ lat: punto.lat, lng: punto.lng });
        const color = speedColor(punto.speed);
        const marker = new google.maps.Marker({
          position: { lat: punto.lat, lng: punto.lng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22">
                <circle cx="11" cy="11" r="10" fill="${color}" opacity="0.22"/>
                <circle cx="11" cy="11" r="5.5" fill="${color}" stroke="white" stroke-width="2"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(22, 22),
            anchor: new google.maps.Point(11, 11),
          },
          zIndex: 6,
        });

        marker.addListener('click', () => setTooltipPunto(punto));

        historialMarkersRef.current.push(marker);
      });

      // Auto-centrar para mostrar todo el recorrido
      map.fitBounds(bounds, 60);
    }

    return () => {
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      historialMarkersRef.current.forEach(m => m.setMap(null));
      historialMarkersRef.current = [];
    };
  }, [historialRuta, map]);

  // Función para simular refresh (los datos ya son en tiempo real)
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Cargar configuración de GPS desde Firebase
  useEffect(() => {
    const cargarConfigGPS = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'configuracion', 'gps_tracking'));
        if (configDoc.exists()) {
          const estadoActual = configDoc.data().habilitado || false;
          console.log('[PanelFlota] Config GPS cargada:', estadoActual);
          setGpsHabilitado(estadoActual);
        } else {
          // Crear documento con valor por defecto (deshabilitado)
          console.log('[PanelFlota] Creando config GPS por defecto: false');
          await setDoc(doc(db, 'configuracion', 'gps_tracking'), { habilitado: false });
          setGpsHabilitado(false);
        }
      } catch (error) {
        console.error('[PanelFlota] Error cargando config GPS:', error);
        // En caso de error, mantener deshabilitado
        setGpsHabilitado(false);
      } finally {
        setLoadingGpsConfig(false);
      }
    };
    cargarConfigGPS();
  }, []);

  // Toggle GPS habilitado/deshabilitado
  const toggleGpsHabilitado = async () => {
    const nuevoEstado = !gpsHabilitado;
    console.log('[PanelFlota] Cambiando GPS de', gpsHabilitado, 'a', nuevoEstado);
    try {
      await setDoc(doc(db, 'configuracion', 'gps_tracking'), { habilitado: nuevoEstado });
      setGpsHabilitado(nuevoEstado);
      console.log('[PanelFlota] GPS tracking guardado:', nuevoEstado ? 'HABILITADO' : 'DESHABILITADO');
    } catch (error) {
      console.error('[PanelFlota] Error actualizando config GPS:', error);
    }
  };

  // Cargar Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script',
  });

  // Escuchar cambios en tiempo real de ubicaciones
  useEffect(() => {
    const q = query(collection(db, 'ubicaciones'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ubicacionesData: UbicacionUnidad[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ubicacionesData.push({
          id: doc.id,
          unidad: data.unidad || doc.id,
          patente: data.patente || '',
          chofer: data.chofer || 'Sin asignar',
          lat: data.lat || 0,
          lng: data.lng || 0,
          activo: data.activo || false,
          enBase: data.enBase || false,
          baseNombre: data.baseNombre || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          // Inferir sector: si tiene HDR es distribución, si no es VRAC
          sector: data.sector || (data.hdr ? 'distribucion' : 'vrac'),
          hdr: data.hdr || null,
          kmRecorridos: data.kmRecorridos ?? undefined,
        });
      });
      // Notificación al supervisor al detectar cambios de estado (solo horario 6am–18pm)
      const hora = new Date().getHours();
      if (hora >= 6 && hora < 18 && prevUbicacionesRef.current.size > 0) {
        ubicacionesData.forEach(u => {
          const prev = prevUbicacionesRef.current.get(u.id);
          if (prev) {
            if (!prev.activo && u.activo) {
              toast(`🟢 INT-${u.unidad} salió de base`, { duration: 4000 });
              playBeep();
            } else if (!prev.enBase && u.enBase) {
              toast(`🔵 INT-${u.unidad} llegó a ${u.baseNombre || 'base'}`, { duration: 4000 });
              playBeep();
            }
          }
        });
      }
      prevUbicacionesRef.current = new Map(ubicacionesData.map(u => [u.id, u]));
      setUbicaciones(ubicacionesData);
    });

    return () => unsubscribe();
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Formatear tiempo transcurrido
  const tiempoTranscurrido = (fecha: Date): string => {
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - fecha.getTime()) / 1000);

    if (diff < 60) return `hace ${diff} seg`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} días`;
  };

  // Filtrar ubicaciones por sector
  const ubicacionesFiltradas = useMemo(() => {
    if (filtroSector === 'todos') return ubicaciones;
    return ubicaciones.filter(u => u.sector === filtroSector);
  }, [ubicaciones, filtroSector]);

  // Unidades activas y en base (ya filtradas)
  const unidadesActivas = ubicacionesFiltradas.filter(u => u.activo && u.lat !== 0);
  const unidadesEnBase = ubicacionesFiltradas.filter(u => u.enBase && !u.activo);

  // Contadores por sector (sin filtrar)
  const contadores = useMemo(() => ({
    todos: ubicaciones.length,
    vrac: ubicaciones.filter(u => u.sector === 'vrac').length,
    distribucion: ubicaciones.filter(u => u.sector === 'distribucion').length,
    vital_aire: ubicaciones.filter(u => u.sector === 'vital_aire').length,
  }), [ubicaciones]);

  if (loadError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          Error al cargar Google Maps. Verifica la API Key.
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden relative">
      {/* Header - parte del flujo normal */}
      <div className="flex-shrink-0 bg-gray-900 z-20">
        {/* Primera fila: Volver + Logo */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white hover:text-green-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver</span>
          </button>
          <img src="/LogoCross.png" alt="Crosslog" className="h-7" />
        </div>

        {/* Segunda fila: Hamburguesa + Filtros + Refresh + GPS */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-700/30">
          {/* Izquierda: Hamburguesa + Filtros */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                showSidebar
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={showSidebar ? { backgroundColor: '#BFCE2A', color: '#1a2e35' } : {}}
              title="Lista de unidades"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex gap-0.5">
              <button
                onClick={() => setFiltroSector('todos')}
                className={`px-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filtroSector === 'todos'
                    ? 'bg-white text-gray-800'
                    : 'bg-gray-700/80 text-gray-300'
                }`}
              >
                T ({contadores.todos})
              </button>
              <button
                onClick={() => setFiltroSector('vrac')}
                className={`px-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filtroSector === 'vrac'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700/80 text-gray-300'
                }`}
              >
                VR ({contadores.vrac})
              </button>
              <button
                onClick={() => setFiltroSector('distribucion')}
                className={`px-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filtroSector === 'distribucion'
                    ? 'text-gray-900'
                    : 'bg-gray-700/80 text-gray-300'
                }`}
                style={filtroSector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
              >
                DI ({contadores.distribucion})
              </button>
              <button
                onClick={() => setFiltroSector('vital_aire')}
                className={`px-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filtroSector === 'vital_aire'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/80 text-gray-300'
                }`}
              >
                VA ({contadores.vital_aire})
              </button>
            </div>
          </div>

          {/* Derecha: Contadores + Refresh + GPS */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-green-400 font-medium">{unidadesActivas.length}🟢</span>
            <span className="text-[10px] text-blue-400 font-medium">{unidadesEnBase.length}🔵</span>
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all flex items-center justify-center ${
                refreshing ? 'animate-spin' : ''
              }`}
              disabled={refreshing}
              title="Actualizar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={toggleGpsHabilitado}
              disabled={loadingGpsConfig}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                gpsHabilitado ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              } ${loadingGpsConfig ? 'opacity-50' : ''}`}
              style={gpsHabilitado ? { backgroundColor: '#BFCE2A', color: '#1a2e35' } : {}}
              title={gpsHabilitado ? 'GPS Activo' : 'GPS Inactivo'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor principal - mapa y paneles */}
      <div className="flex-1 relative overflow-hidden">
        {/* Panel Izquierdo - Lista de Unidades (Colapsable) */}
        <div
          className={`absolute top-0 left-0 bottom-0 z-10 w-72 bg-gray-800/95 backdrop-blur-sm transition-transform duration-300 overflow-hidden ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
        <div className="h-full flex flex-col">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">
              Unidades ({ubicacionesFiltradas.length})
            </h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={sidebarListRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            {ubicacionesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📍</div>
                <p className="text-sm">No hay unidades</p>
              </div>
            ) : (
              ubicacionesFiltradas.map((unidad) => {
                const estado = unidad.activo ? 'en-ruta' : unidad.enBase ? 'en-base' : 'inactivo';
                const estiloFondo = {
                  'en-ruta': 'bg-green-900/50 hover:bg-green-900/70 border-green-700',
                  'en-base': 'bg-blue-900/50 hover:bg-blue-900/70 border-blue-700',
                  'inactivo': 'bg-gray-700/50 hover:bg-gray-700/70 border-gray-600'
                }[estado];
                const textoEstado = {
                  'en-ruta': '🟢 Ruta',
                  'en-base': '🔵 Base',
                  'inactivo': '⚫ Inactivo'
                }[estado];
                const isHighlighted = highlightedUnidad?.id === unidad.id;

                return (
                  <div
                    key={unidad.id}
                    data-unidad-id={unidad.id}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${estiloFondo} ${
                      isHighlighted ? 'ring-2 ring-yellow-400' : ''
                    }`}
                    onClick={() => {
                      if (unidad.lat !== 0 && map) {
                        map.panTo({ lat: unidad.lat, lng: unidad.lng });
                        map.setZoom(15);
                        limpiarHistorial();
                        setSelectedUnidad(unidad);
                        setHighlightedUnidad(null);
                        setShowSidebar(false);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            unidad.sector === 'distribucion'
                              ? 'text-gray-900'
                              : unidad.sector === 'vital_aire'
                              ? 'bg-orange-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                          style={unidad.sector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
                        >
                          {unidad.sector === 'distribucion' ? 'D' : unidad.sector === 'vital_aire' ? 'V' : 'R'}
                        </span>
                        <span className="font-bold text-white text-sm">INT-{unidad.unidad}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{textoEstado}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {unidad.patente} • {unidad.chofer.split(' ')[0]}
                    </div>
                    {unidad.hdr && (
                      <div className="text-[10px] text-blue-400 mt-0.5">📋 {unidad.hdr}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex-shrink-0 border-t border-gray-700 p-3">
            <button
              onClick={() => setShowHistorial(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 text-sm font-medium transition-colors"
            >
              <span>🗺️</span>
              <span>Viajes y Rutas</span>
            </button>
          </div>
          </div>
        </div>

        {/* Mapa - Ocupa todo el espacio */}
        <div className="h-full">
        {!isLoaded ? (
          <div className="h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <div className="animate-spin text-4xl mb-2">⏳</div>
              <p>Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={10}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
            onClick={() => { setSelectedUnidad(null); limpiarHistorial(); }}
          >
            {/* Marcadores de Bases Crosslog */}
            {BASES_CROSSLOG.map((base) => (
              <Marker
                key={base.id}
                position={{ lat: base.lat, lng: base.lng }}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="48" height="62">
                      <path d="M20 0 C9 0 0 9 0 20 C0 35 20 52 20 52 C20 52 40 35 40 20 C40 9 31 0 20 0Z" fill="#BFCE2A" stroke="#fff" stroke-width="2"/>
                      <circle cx="20" cy="18" r="12" fill="#1a2e35"/>
                      <text x="20" y="23" text-anchor="middle" fill="#BFCE2A" font-size="14" font-weight="bold" font-family="Arial">X</text>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(48, 62),
                  anchor: new google.maps.Point(24, 62),
                }}
                title={`${base.nombre} - ${base.direccion}`}
              />
            ))}

            {/* Marcadores de unidades activas con labels */}
            {unidadesActivas.map((unidad) => {
              const colorSector = {
                'distribucion': '#BFCE2A',
                'vrac': '#3B82F6',
                'vital_aire': '#F97316'
              }[unidad.sector || 'vrac'] || '#3B82F6';

              return (
                <div key={unidad.id}>
                  <OverlayView
                    position={{ lat: unidad.lat, lng: unidad.lng }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div
                      onClick={() => handleMarkerClick(unidad)}
                      style={{
                        transform: 'translate(-50%, -100%)',
                        marginTop: '-20px'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#111827',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          border: '1px solid #d1d5db',
                          display: 'inline-block'
                        }}
                      >
                        INT {unidad.unidad} - {unidad.patente}
                      </div>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          margin: '0 auto',
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #ffffff',
                        }}
                      />
                    </div>
                  </OverlayView>

                  <Marker
                    position={{ lat: unidad.lat, lng: unidad.lng }}
                    onClick={() => handleMarkerClick(unidad)}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(vehiculoSVG(unidad.sector, true)),
                      scaledSize: new google.maps.Size(vehiculoIconSize(unidad.sector).w, vehiculoIconSize(unidad.sector).h),
                      anchor: new google.maps.Point(vehiculoIconSize(unidad.sector).w / 2, vehiculoIconSize(unidad.sector).h / 2),
                    }}
                  />
                </div>
              );
            })}

            {/* Polyline historial: gestionado por useEffect con API directa */}

            {/* Tooltip personalizado para puntos del historial */}
            {tooltipPunto && (
              <OverlayView
                position={{ lat: tooltipPunto.lat, lng: tooltipPunto.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{ display: 'inline-block', transform: 'translate(-50%, -100%)', paddingBottom: '10px' }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '8px 28px 8px 10px',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.22)',
                    fontSize: '13px',
                    fontFamily: 'sans-serif',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    border: '1px solid #e5e7eb',
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setTooltipPunto(null); }}
                      style={{
                        position: 'absolute',
                        top: 5, right: 7,
                        background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '15px',
                        color: '#9ca3af', padding: 0, lineHeight: 1,
                        fontWeight: 'bold',
                      }}
                    >×</button>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>
                      ⏱️ {tooltipPunto.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ color: speedColor(tooltipPunto.speed), fontWeight: 700 }}>
                      ⚡ {tooltipPunto.speed} km/h
                    </div>
                  </div>
                  {/* Caret apuntando al punto */}
                  <div style={{
                    width: 0, height: 0, margin: '0 auto',
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid white',
                  }} />
                </div>
              </OverlayView>
            )}

            {/* Marcadores de unidades EN BASE */}
            {unidadesEnBase.map((unidad, index) => {
              const base = BASES_CROSSLOG.find(b => b.nombre === unidad.baseNombre) || BASES_CROSSLOG[0];
              const posicion = dispersarPosicion(base.lat, base.lng, index, unidadesEnBase.length);
              const unidadConPosicion = { ...unidad, lat: posicion.lat, lng: posicion.lng };

              return (
                <div key={unidad.id}>
                  <OverlayView
                    position={posicion}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div
                      onClick={() => handleMarkerClick(unidadConPosicion)}
                      style={{
                        transform: 'translate(-50%, -100%)',
                        marginTop: '-18px'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#111827',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          border: '1px solid #d1d5db',
                          display: 'inline-block'
                        }}
                      >
                        INT {unidad.unidad} - {unidad.patente}
                      </div>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          margin: '0 auto',
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #ffffff',
                        }}
                      />
                    </div>
                  </OverlayView>

                  <Marker
                    position={posicion}
                    onClick={() => handleMarkerClick(unidadConPosicion)}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(vehiculoSVG(unidad.sector, false)),
                      scaledSize: new google.maps.Size(vehiculoIconSize(unidad.sector).w, vehiculoIconSize(unidad.sector).h),
                      anchor: new google.maps.Point(vehiculoIconSize(unidad.sector).w / 2, vehiculoIconSize(unidad.sector).h / 2),
                    }}
                  />
                </div>
              );
            })}
          </GoogleMap>
        )}
        </div>

        {/* Panel Derecho - Detalles de Unidad (aparece solo al seleccionar) */}
        {selectedUnidad && (
          <div className="absolute top-0 right-0 bottom-0 z-10 w-72 bg-gray-800/95 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            {/* Header del panel */}
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚛</span>
                <span className="font-bold text-white">INT-{selectedUnidad.unidad}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedUnidad.sector === 'distribucion'
                      ? 'text-gray-900'
                      : selectedUnidad.sector === 'vital_aire'
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                  style={selectedUnidad.sector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
                >
                  {selectedUnidad.sector === 'distribucion' ? 'DIST' : selectedUnidad.sector === 'vital_aire' ? 'VITAL' : 'VRAC'}
                </span>
              </div>
              <button
                onClick={() => { setSelectedUnidad(null); limpiarHistorial(); }}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Contenido del panel */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">

              {/* === 1: Estado compacto + botón centrar === */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                selectedUnidad.activo
                  ? 'bg-green-900/50 border border-green-700'
                  : selectedUnidad.enBase
                  ? 'bg-blue-900/50 border border-blue-700'
                  : 'bg-gray-700/50 border border-gray-600'
              }`}>
                <span className="text-2xl flex-shrink-0">
                  {selectedUnidad.activo ? '🟢' : selectedUnidad.enBase ? '🔵' : '⚫'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">
                    {selectedUnidad.activo ? 'En Ruta' : selectedUnidad.enBase ? 'En Base' : 'Inactivo'}
                  </p>
                  {selectedUnidad.enBase && selectedUnidad.baseNombre && (
                    <p className="text-xs text-gray-400 truncate">{selectedUnidad.baseNombre}</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-0.5">{tiempoTranscurrido(selectedUnidad.timestamp)}</p>
                </div>
                <button
                  onClick={() => {
                    if (map) {
                      map.panTo({ lat: selectedUnidad.lat, lng: selectedUnidad.lng });
                      map.setZoom(16);
                    }
                  }}
                  title="Centrar en mapa"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-gray-200 hover:text-white rounded-lg text-sm font-bold transition-colors"
                >
                  ↗
                </button>
              </div>

              {/* === 2: Patente + Chofer en 2 columnas === */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-700/40 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Patente</p>
                  <p className="text-white font-bold text-sm mt-0.5">🚙 {selectedUnidad.patente}</p>
                </div>
                <div className="bg-gray-700/40 rounded-lg p-3 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Chofer</p>
                  <p className="text-white font-semibold text-sm mt-0.5 truncate" title={selectedUnidad.chofer}>
                    👤 {selectedUnidad.chofer}
                  </p>
                </div>
              </div>

              {/* HDR — solo si existe */}
              {selectedUnidad.hdr && (
                <div className="bg-gray-700/40 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-base flex-shrink-0">📋</span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Hoja de Ruta</p>
                    <p className="text-blue-400 font-bold text-sm truncate">{selectedUnidad.hdr}</p>
                  </div>
                </div>
              )}

              {/* === 3: Último recorrido === */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Último recorrido</p>

                {selectedUnidad.sector === 'vrac' ? (
                  /* ---- VRAC: filtro por rango de fecha/hora ---- */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <p className="text-[9px] text-gray-400 mb-0.5">Desde</p>
                        <input
                          type="datetime-local"
                          value={historialDesde}
                          onChange={e => setHistorialDesde(e.target.value)}
                          className="w-full bg-gray-700 text-white text-[11px] rounded-lg px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 mb-0.5">Hasta</p>
                        <input
                          type="datetime-local"
                          value={historialHasta}
                          onChange={e => setHistorialHasta(e.target.value)}
                          className="w-full bg-gray-700 text-white text-[11px] rounded-lg px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => cargarHistorialRango(selectedUnidad.id, historialDesde, historialHasta)}
                      disabled={loadingHistorial || !historialDesde || !historialHasta}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      {loadingHistorial ? '⏳ Cargando...' : '🗺️ Ver ruta'}
                    </button>

                    {historialUnidadId === selectedUnidad.id && historialCargado && (
                      historialRuta.length === 0 ? (
                        <div className="bg-gray-700/40 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-xs">Sin puntos GPS en ese rango</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-blue-400 text-center">
                            {historialRuta.length} puntos · {new Date(historialDesde).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} → {new Date(historialHasta).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-700/60 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-gray-400">Puntos GPS</p>
                              <p className="text-white font-bold text-sm">{historialRuta.length}</p>
                            </div>
                            <div className="bg-gray-700/60 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-gray-400">Vel. máx.</p>
                              <p className="text-white font-bold text-sm">
                                {Math.max(...historialRuta.map(p => p.speed)).toFixed(0)} km/h
                              </p>
                            </div>
                          </div>
                          {(() => {
                            const kmGPS = historialRuta.length >= 2
                              ? Math.round(historialRuta.reduce((total, p, i) => {
                                  if (i === 0) return 0;
                                  return total + haversineKm(historialRuta[i-1].lat, historialRuta[i-1].lng, p.lat, p.lng);
                                }, 0) * 10) / 10
                              : 0;
                            const rango = `${new Date(historialDesde).toLocaleDateString('en-CA')}_${new Date(historialHasta).toLocaleDateString('en-CA')}`;
                            const exportarCSV = () => {
                              const u = selectedUnidad;
                              const SEP = ';';
                              const encabezado = `sep=${SEP}\nINT-${u.unidad} | ${u.patente} | ${u.chofer} | ${rango} | ${kmGPS} km\n`;
                              const columnas = ['Fecha','Hora','Latitud','Longitud','Velocidad (km/h)','Km acumulado'].join(SEP) + '\n';
                              let kmAcum = 0;
                              const filas = historialRuta.map((p, i) => {
                                if (i > 0) kmAcum += haversineKm(historialRuta[i-1].lat, historialRuta[i-1].lng, p.lat, p.lng);
                                return [
                                  p.timestamp.toLocaleDateString('es-AR'),
                                  p.timestamp.toLocaleTimeString('es-AR'),
                                  p.lat.toFixed(6).replace('.', ','),
                                  p.lng.toFixed(6).replace('.', ','),
                                  p.speed.toFixed(1).replace('.', ','),
                                  (Math.round(kmAcum * 10) / 10).toFixed(1).replace('.', ',')
                                ].join(SEP);
                              }).join('\n');
                              const blob = new Blob(['\uFEFF' + encabezado + columnas + filas], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = `historial_INT${u.unidad}_${rango}.csv`; a.click();
                              URL.revokeObjectURL(url);
                            };
                            return (
                              <div className="bg-blue-900/40 border border-blue-700/50 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-blue-300 font-bold text-sm">🛣️ {kmGPS} km recorridos</p>
                                  <button onClick={exportarCSV} className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1.5 rounded-lg transition-colors" title="Descargar CSV">↓ CSV</button>
                                </div>
                              </div>
                            );
                          })()}
                          <button onClick={limpiarHistorial} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
                            Ocultar ruta
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  /* ---- DIST / VITAL_AIRE: comportamiento original ---- */
                  historialUnidadId === selectedUnidad.id && historialCargado && historialRuta.length === 0 ? (
                    <div className="space-y-2">
                      <div className="bg-gray-700/40 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs">Sin recorrido registrado</p>
                        <p className="text-gray-500 text-[10px] mt-1">El historial se genera con el nuevo APK</p>
                      </div>
                      <button onClick={limpiarHistorial} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
                        Cerrar
                      </button>
                    </div>
                  ) : historialUnidadId === selectedUnidad.id && historialRuta.length > 0 ? (
                    <div className="space-y-2">
                      {historialFecha && (
                        <p className="text-[10px] text-gray-400 text-center">
                          📅 {new Date(historialFecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-700/60 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-gray-400">Puntos GPS</p>
                          <p className="text-white font-bold text-sm">{historialRuta.length}</p>
                        </div>
                        <div className="bg-gray-700/60 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-gray-400">Vel. máx.</p>
                          <p className="text-white font-bold text-sm">
                            {Math.max(...historialRuta.map(p => p.speed)).toFixed(0)} km/h
                          </p>
                        </div>
                      </div>
                      {/* Card km recorridos + tarifa */}
                      {(() => {
                        const kmGPS = historialRuta.length >= 2
                          ? Math.round(historialRuta.reduce((total, p, i) => {
                              if (i === 0) return 0;
                              return total + haversineKm(historialRuta[i-1].lat, historialRuta[i-1].lng, p.lat, p.lng);
                            }, 0) * 10) / 10
                          : 0;
                        const kmParaTarifa = selectedUnidad.kmRecorridos ?? kmGPS;
                        const tarifa = selectedUnidad.sector === 'distribucion' ? buscarTarifa(kmParaTarifa) : null;
                        const exportarCSV = () => {
                          const u = selectedUnidad;
                          const fecha = historialFecha ?? new Date().toLocaleDateString('en-CA');
                          const SEP = ';';
                          const encabezado = `sep=${SEP}\nINT-${u.unidad} | ${u.patente} | ${u.chofer} | ${fecha} | ${kmGPS} km\n`;
                          const columnas = ['Fecha','Hora','Latitud','Longitud','Velocidad (km/h)','Km acumulado'].join(SEP) + '\n';
                          let kmAcum = 0;
                          const filas = historialRuta.map((p, i) => {
                            if (i > 0) kmAcum += haversineKm(historialRuta[i-1].lat, historialRuta[i-1].lng, p.lat, p.lng);
                            return [
                              p.timestamp.toLocaleDateString('es-AR'),
                              p.timestamp.toLocaleTimeString('es-AR'),
                              p.lat.toFixed(6).replace('.', ','),
                              p.lng.toFixed(6).replace('.', ','),
                              p.speed.toFixed(1).replace('.', ','),
                              (Math.round(kmAcum * 10) / 10).toFixed(1).replace('.', ',')
                            ].join(SEP);
                          }).join('\n');
                          const blob = new Blob(['\uFEFF' + encabezado + columnas + filas], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `historial_INT${u.unidad}_${fecha}.csv`; a.click();
                          URL.revokeObjectURL(url);
                        };
                        return (
                          <div className="bg-blue-900/40 border border-blue-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-blue-300 font-bold text-sm">
                                  🛣️ {selectedUnidad.kmRecorridos ?? kmGPS} km recorridos
                                </p>
                                {selectedUnidad.sector === 'distribucion' && (
                                  <p className="text-[10px] text-amber-400 mt-1 truncate" title={tarifa ? `${tarifa.ruta} · ${tarifa.cliente} · ref. ${tarifa.km} km` : 'REPARTO'}>
                                    🗺️ {tarifa ? `${tarifa.ruta} · ${tarifa.cliente} · ${tarifa.km} km` : 'REPARTO'}
                                  </p>
                                )}
                              </div>
                              <button onClick={exportarCSV} className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1.5 rounded-lg transition-colors" title="Descargar CSV del recorrido">↓ CSV</button>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Card combustible del día */}
                      {cargaCombustibleDia !== undefined && (
                        cargaCombustibleDia ? (
                          <div className="bg-orange-900/40 border border-orange-700/50 rounded-lg p-3">
                            <p className="text-orange-300 font-bold text-sm">⛽ {cargaCombustibleDia.litros} L cargados</p>
                            <p className="text-[10px] text-orange-400/80 mt-0.5">{cargaCombustibleDia.hora}hs ese día</p>
                          </div>
                        ) : (
                          <div className="bg-gray-700/30 border border-gray-600/40 rounded-lg p-3">
                            <p className="text-gray-500 text-xs">⛽ Sin carga de combustible ese día</p>
                          </div>
                        )
                      )}
                      <button onClick={limpiarHistorial} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
                        Ocultar ruta
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => cargarHistorial(selectedUnidad.id)}
                      disabled={loadingHistorial}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      {loadingHistorial ? '⏳ Cargando...' : '🗺️ Ver ruta de hoy'}
                    </button>
                  )
                )}
              </div>

              {/* === 4: Performance Service (reservado) === */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Servicios</p>
                <div className="bg-gray-700/20 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs">🔧 Performance Service</p>
                  <p className="text-gray-600 text-[10px] mt-1">Próximamente</p>
                </div>
              </div>

            </div>
          </div>
          </div>
        )}
      </div>

      {/* Overlay Historial de Viajes */}
      {showHistorial && (
        <div className="absolute inset-0 z-50 bg-gray-900 overflow-auto">
          <HistorialViajes onClose={() => setShowHistorial(false)} />
        </div>
      )}
    </div>
  );
}
