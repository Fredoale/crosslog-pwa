import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';
import { collection, onSnapshot, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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

export function PanelFlota({ onClose }: PanelFlotaProps) {
  const [ubicaciones, setUbicaciones] = useState<UbicacionUnidad[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<UbicacionUnidad | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsHabilitado, setGpsHabilitado] = useState<boolean>(false);
  const [loadingGpsConfig, setLoadingGpsConfig] = useState(true);
  const [filtroSector, setFiltroSector] = useState<FiltroSector>('todos');
  const [showSidebar, setShowSidebar] = useState(false); // Panel izquierdo colapsable
  // Handler para click en marcador (toggle InfoWindow)
  const handleMarkerClick = useCallback((unidad: UbicacionUnidad) => {
    // Si ya está seleccionada esta unidad, cerrar InfoWindow
    if (selectedUnidad?.id === unidad.id) {
      setSelectedUnidad(null);
    } else {
      // Si no, abrir InfoWindow de esta unidad
      setSelectedUnidad(unidad);
    }
  }, [selectedUnidad]);

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
        });
      });
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
    <div className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden">
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

        {/* Segunda fila: Controles */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/30">
          {/* Izquierda: Hamburguesa + Filtros */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-lg transition-all ${
                showSidebar
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={showSidebar ? { backgroundColor: '#BFCE2A', color: '#1a2e35' } : {}}
              title="Lista de unidades"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setFiltroSector('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroSector === 'todos'
                    ? 'bg-white text-gray-800'
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Todos ({contadores.todos})
              </button>
              <button
                onClick={() => setFiltroSector('vrac')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroSector === 'vrac'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
              >
                VRAC ({contadores.vrac})
              </button>
              <button
                onClick={() => setFiltroSector('distribucion')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroSector === 'distribucion'
                    ? 'text-gray-900'
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
                style={filtroSector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
              >
                DIST ({contadores.distribucion})
              </button>
              <button
                onClick={() => setFiltroSector('vital_aire')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroSector === 'vital_aire'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
              >
                VITAL ({contadores.vital_aire})
              </button>
            </div>
          </div>

          {/* Derecha: Contadores + Refresh + GPS */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-xs text-green-400 font-medium">{unidadesActivas.length} ruta</span>
            <span className="sm:hidden text-[10px] text-green-400 font-medium">{unidadesActivas.length}🟢</span>
            <span className="text-gray-500 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-xs text-blue-400 font-medium">{unidadesEnBase.length} base</span>
            <span className="sm:hidden text-[10px] text-blue-400 font-medium">{unidadesEnBase.length}🔵</span>
            <div className="flex items-center gap-1 ml-1">
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
                  gpsHabilitado
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
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

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                const isSelected = selectedUnidad?.id === unidad.id;

                return (
                  <div
                    key={unidad.id}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${estiloFondo} ${
                      isSelected ? 'ring-2 ring-green-400' : ''
                    }`}
                    onClick={() => {
                      if (unidad.lat !== 0 && map) {
                        map.panTo({ lat: unidad.lat, lng: unidad.lng });
                        map.setZoom(15);
                        setSelectedUnidad(unidad);
                        setShowSidebar(false); // Cerrar panel izquierdo automáticamente
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
            onClick={() => setSelectedUnidad(null)} // Cerrar panel derecho al click en mapa
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
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                          <circle cx="12" cy="12" r="10" fill="${colorSector}" stroke="#fff" stroke-width="2"/>
                          <circle cx="12" cy="12" r="4" fill="#fff"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(32, 32),
                      anchor: new google.maps.Point(16, 16),
                    }}
                  />
                </div>
              );
            })}

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
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
                          <circle cx="12" cy="12" r="10" fill="#4B5563" stroke="#fff" stroke-width="2"/>
                          <circle cx="12" cy="12" r="4" fill="#fff"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(28, 28),
                      anchor: new google.maps.Point(14, 14),
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
                onClick={() => setSelectedUnidad(null)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Contenido del panel */}
            <div className="flex-1 p-4 space-y-4">
              {/* Estado */}
              <div className={`p-3 rounded-lg ${
                selectedUnidad.activo
                  ? 'bg-green-900/50 border border-green-700'
                  : selectedUnidad.enBase
                  ? 'bg-blue-900/50 border border-blue-700'
                  : 'bg-gray-700/50 border border-gray-600'
              }`}>
                <div className="text-center">
                  <span className="text-2xl">
                    {selectedUnidad.activo ? '🟢' : selectedUnidad.enBase ? '🔵' : '⚫'}
                  </span>
                  <p className="text-white font-bold mt-1">
                    {selectedUnidad.activo ? 'En Ruta' : selectedUnidad.enBase ? 'En Base' : 'Inactivo'}
                  </p>
                  {selectedUnidad.enBase && selectedUnidad.baseNombre && (
                    <p className="text-xs text-gray-400">{selectedUnidad.baseNombre}</p>
                  )}
                </div>
              </div>

              {/* Información */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <span className="text-xl">🚙</span>
                  <div>
                    <p className="text-xs text-gray-400">Patente</p>
                    <p className="font-bold">{selectedUnidad.patente}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-white">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-xs text-gray-400">Chofer</p>
                    <p className="font-bold">{selectedUnidad.chofer}</p>
                  </div>
                </div>

                {selectedUnidad.hdr && (
                  <div className="flex items-center gap-3 text-white">
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="text-xs text-gray-400">Hoja de Ruta</p>
                      <p className="font-bold text-blue-400">{selectedUnidad.hdr}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-white">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <p className="text-xs text-gray-400">Última actualización</p>
                    <p className="font-bold">{tiempoTranscurrido(selectedUnidad.timestamp)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-white">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="text-xs text-gray-400">Coordenadas</p>
                    <p className="font-mono text-xs">{selectedUnidad.lat.toFixed(5)}, {selectedUnidad.lng.toFixed(5)}</p>
                  </div>
                </div>
              </div>

              {/* Botón centrar */}
              <button
                onClick={() => {
                  if (map) {
                    map.panTo({ lat: selectedUnidad.lat, lng: selectedUnidad.lng });
                    map.setZoom(16);
                  }
                }}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
              >
                  📍 Centrar en Mapa
              </button>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
