import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, OverlayView } from '@react-google-maps/api';
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

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '16px',
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            Error al cargar Google Maps. Verifica la API Key.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white hover:text-green-400 transition-colors"
          >
            <span>←</span>
            <span>Volver</span>
          </button>
          <h1 className="text-xl font-bold text-white">📍 Panel de Flota</h1>
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right text-xs">
              <span className="text-green-400">{unidadesActivas.length} en ruta</span>
              <span className="text-blue-400">{unidadesEnBase.length} en base</span>
            </div>
            <button
              onClick={handleRefresh}
              className={`text-white hover:text-green-400 transition-all ${refreshing ? 'animate-spin' : ''}`}
              disabled={refreshing}
            >
              🔄
            </button>
          </div>
        </div>

        {/* Control GPS para Choferes */}
        <div className={`mb-4 p-4 rounded-2xl shadow-lg ${gpsHabilitado ? 'bg-green-900' : 'bg-gray-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{gpsHabilitado ? '📡' : '📴'}</span>
              <div>
                <p className="font-bold text-white">GPS para Choferes</p>
                <p className="text-xs text-gray-300">
                  {gpsHabilitado
                    ? 'Los choferes verán la opción de activar GPS después del checklist'
                    : 'GPS desactivado - Los choferes no verán esta opción'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleGpsHabilitado}
              disabled={loadingGpsConfig}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                gpsHabilitado ? 'bg-green-500' : 'bg-gray-500'
              } ${loadingGpsConfig ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  gpsHabilitado ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {gpsHabilitado && (
            <div className="mt-3 pt-3 border-t border-green-700 text-xs text-green-200">
              ✅ Activo: El paso de "Activar GPS" aparecerá en VRAC y Distribución
            </div>
          )}
        </div>

        {/* Filtros por Sector - Responsive */}
        <div className="mb-4 grid grid-cols-4 gap-1">
          <button
            onClick={() => setFiltroSector('todos')}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
              filtroSector === 'todos'
                ? 'bg-white text-gray-800 shadow-lg'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            Todos
            <span className="block text-[10px] opacity-75">({contadores.todos})</span>
          </button>
          <button
            onClick={() => setFiltroSector('vrac')}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
              filtroSector === 'vrac'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            VRAC
            <span className="block text-[10px] opacity-75">({contadores.vrac})</span>
          </button>
          <button
            onClick={() => setFiltroSector('distribucion')}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
              filtroSector === 'distribucion'
                ? 'text-gray-900 shadow-lg'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
            style={filtroSector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
          >
            DIST
            <span className="block text-[10px] opacity-75">({contadores.distribucion})</span>
          </button>
          <button
            onClick={() => setFiltroSector('vital_aire')}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
              filtroSector === 'vital_aire'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            VITAL
            <span className="block text-[10px] opacity-75">({contadores.vital_aire})</span>
          </button>
        </div>

        {/* Mapa */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          {!isLoaded ? (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
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
                // Colores por sector
                const colorSector = {
                  'distribucion': '#BFCE2A', // Verde Crosslog
                  'vrac': '#3B82F6',         // Azul
                  'vital_aire': '#F97316'    // Naranja
                }[unidad.sector || 'vrac'] || '#3B82F6';

                return (
                  <div key={unidad.id}>
                    {/* Label encima del marcador - fondo blanco */}
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
                        {/* Triángulo apuntando hacia abajo */}
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

                    {/* Marcador */}
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

              {/* Marcadores de unidades EN BASE (dispersados a la derecha) con labels */}
              {unidadesEnBase.map((unidad, index) => {
                // Encontrar la base correspondiente
                const base = BASES_CROSSLOG.find(b => b.nombre === unidad.baseNombre) || BASES_CROSSLOG[0];
                const posicion = dispersarPosicion(base.lat, base.lng, index, unidadesEnBase.length);
                const unidadConPosicion = { ...unidad, lat: posicion.lat, lng: posicion.lng };

                return (
                  <div key={unidad.id}>
                    {/* Label encima del marcador - fondo blanco */}
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
                        {/* Triángulo apuntando hacia abajo */}
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

                    {/* Marcador */}
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

              {/* InfoWindow con click (se cierra con X o click en otro marcador) */}
              {selectedUnidad && (
                <InfoWindow
                  position={{ lat: selectedUnidad.lat, lng: selectedUnidad.lng }}
                  onCloseClick={() => setSelectedUnidad(null)}
                  options={{
                    disableAutoPan: true,
                    pixelOffset: new google.maps.Size(0, -10)
                  }}
                >
                  <div className="text-center p-1">
                    {/* Unidad + Sector en línea */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-800">🚛 INT-{selectedUnidad.unidad}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        selectedUnidad.sector === 'distribucion'
                          ? 'text-white'
                          : selectedUnidad.sector === 'vital_aire'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`} style={selectedUnidad.sector === 'distribucion' ? { backgroundColor: '#BFCE2A', color: '#1a2e35' } : {}}>
                        {selectedUnidad.sector === 'distribucion' ? 'DIST' : selectedUnidad.sector === 'vital_aire' ? 'VITAL' : 'VRAC'}
                      </span>
                    </div>

                    {/* Patente */}
                    <div className="text-xs text-gray-600">{selectedUnidad.patente}</div>

                    {/* Chofer */}
                    <div className="text-xs text-gray-700">👤 {selectedUnidad.chofer}</div>

                    {/* HDR solo para distribución */}
                    {selectedUnidad.hdr && (
                      <div className="text-xs text-blue-600 font-medium">📋 {selectedUnidad.hdr}</div>
                    )}

                    {/* Última actualización */}
                    <div className="text-[10px] text-gray-400">⏱️ {tiempoTranscurrido(selectedUnidad.timestamp)}</div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Lista de unidades */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h2 className="font-bold text-gray-800 mb-3">
            Estado de Unidades ({ubicacionesFiltradas.length})
            {filtroSector !== 'todos' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filtroSector === 'vrac' ? 'VRAC' : filtroSector === 'distribucion' ? 'Distribución' : 'Vital Aire'}
              </span>
            )}
          </h2>

          {ubicacionesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📍</div>
              <p>No hay unidades registradas</p>
              <p className="text-sm mt-1">
                Las ubicaciones aparecerán cuando los choferes activen el tracking
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ubicacionesFiltradas.map((unidad) => {
                // Determinar estado y estilos
                const estado = unidad.activo ? 'en-ruta' : unidad.enBase ? 'en-base' : 'inactivo';
                const estiloFondo = {
                  'en-ruta': 'bg-green-50 hover:bg-green-100',
                  'en-base': 'bg-blue-50 hover:bg-blue-100',
                  'inactivo': 'bg-gray-50 hover:bg-gray-100'
                }[estado];
                const estiloBadge = {
                  'en-ruta': 'bg-green-500 text-white',
                  'en-base': 'bg-blue-500 text-white',
                  'inactivo': 'bg-gray-200 text-gray-600'
                }[estado];
                const textoEstado = {
                  'en-ruta': 'En ruta',
                  'en-base': 'En Base',
                  'inactivo': 'Inactivo'
                }[estado];
                const icono = estado === 'en-base' ? '🏠' : '🚛';

                return (
                  <div
                    key={unidad.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${estiloFondo}`}
                    onClick={() => {
                      if (unidad.lat !== 0 && map) {
                        map.panTo({ lat: unidad.lat, lng: unidad.lng });
                        map.setZoom(15);
                        setSelectedUnidad(unidad);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icono}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">INT-{unidad.unidad}</p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              unidad.sector === 'distribucion'
                                ? 'text-gray-900'
                                : unidad.sector === 'vital_aire'
                                ? 'bg-orange-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}
                            style={unidad.sector === 'distribucion' ? { backgroundColor: '#BFCE2A' } : {}}
                          >
                            {unidad.sector === 'distribucion' ? 'DIST' : unidad.sector === 'vital_aire' ? 'VITAL' : 'VRAC'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {unidad.chofer} • {unidad.patente}
                        </p>
                        {unidad.sector === 'distribucion' && unidad.hdr && (
                          <p className="text-xs text-blue-600 font-medium">
                            📋 {unidad.hdr}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estiloBadge}`}>
                        {textoEstado}
                      </span>
                      {(unidad.activo || unidad.enBase) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {tiempoTranscurrido(unidad.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="mt-4 p-4 bg-gray-800 rounded-xl text-gray-300 text-sm">
          <p className="font-semibold text-white mb-1">ℹ️ Información:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Los marcadores verdes indican unidades en ruta</li>
            <li>Toca una unidad en la lista para centrar el mapa</li>
            <li>El mapa se actualiza automáticamente en tiempo real</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
