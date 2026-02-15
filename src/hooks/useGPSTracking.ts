import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Bases Crosslog (geofence)
const BASES_CROSSLOG = [
  {
    id: 'los-cardales',
    lat: -34.36014566238795,
    lng: -59.00991328060013,
    nombre: 'Base Los Cardales'
  },
  {
    id: 'villa-maipu',
    lat: -34.56297844053954,
    lng: -58.52935080773911,
    nombre: 'Base Villa Maipú'
  }
];

// Radio del geofence en metros
const GEOFENCE_RADIUS = 100;

// Función para encontrar la base más cercana
function encontrarBaseCercana(lat: number, lng: number): { base: typeof BASES_CROSSLOG[0]; distancia: number } | null {
  let baseCercana = null;
  let distanciaMinima = Infinity;

  for (const base of BASES_CROSSLOG) {
    const distancia = calcularDistancia(lat, lng, base.lat, base.lng);
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      baseCercana = base;
    }
  }

  return baseCercana ? { base: baseCercana, distancia: distanciaMinima } : null;
}

// Calcular distancia entre dos puntos (fórmula de Haversine)
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en metros
}

interface TrackingConfig {
  unidad: string;
  patente: string;
  chofer: string;
  checklistId?: string;
  sector?: 'vrac' | 'distribucion' | 'vital_aire';
  hdr?: string; // Solo para distribución
}

interface GPSTrackingState {
  isTracking: boolean;
  hasPermission: boolean | null;
  error: string | null;
  lastUpdate: Date | null;
  arrivedAtBase: boolean;
}

export function useGPSTracking() {
  const [state, setState] = useState<GPSTrackingState>({
    isTracking: false,
    hasPermission: null,
    error: null,
    lastUpdate: null,
    arrivedAtBase: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<TrackingConfig | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const stoppedByGeofenceRef = useRef<boolean>(false);

  // Solicitar Wake Lock para mantener pantalla activa
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[GPS] Wake Lock activado');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('[GPS] Wake Lock liberado');
        });
      }
    } catch (err) {
      console.log('[GPS] Wake Lock no disponible:', err);
    }
  };

  // Liberar Wake Lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Detener tracking internamente (para geofence)
  const stopTrackingInternal = async (marcarEnBase: boolean = false) => {
    if (stoppedByGeofenceRef.current) return; // Evitar múltiples llamadas
    stoppedByGeofenceRef.current = true;

    // Limpiar intervalo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Limpiar watchPosition
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Marcar como "en base" en Firebase
    if (configRef.current && marcarEnBase) {
      try {
        await setDoc(doc(db, 'ubicaciones', `INT-${configRef.current.unidad}`), {
          activo: false,
          enBase: true,
          timestamp: serverTimestamp(),
        }, { merge: true });
        console.log('[GPS] 🏠 Unidad marcada EN BASE');
      } catch (error) {
        console.error('[GPS] Error marcando en base:', error);
      }
    }

    // Liberar Wake Lock
    await releaseWakeLock();

    setState(prev => ({
      ...prev,
      isTracking: false,
      arrivedAtBase: marcarEnBase,
    }));
  };

  // Enviar ubicación a Firebase
  const sendLocationToFirebase = async (lat: number, lng: number) => {
    if (!configRef.current || stoppedByGeofenceRef.current) return;

    const { unidad, patente, chofer, checklistId, sector, hdr } = configRef.current;
    const docId = `INT-${unidad}`;

    // Verificar geofence - ¿Está cerca de alguna base?
    const resultado = encontrarBaseCercana(lat, lng);
    if (resultado) {
      console.log(`[GPS] Distancia a ${resultado.base.nombre}: ${resultado.distancia.toFixed(0)} metros`);

      if (resultado.distancia <= GEOFENCE_RADIUS) {
        console.log(`[GPS] 🎯 ¡Llegó a ${resultado.base.nombre}! (${resultado.distancia.toFixed(0)}m <= ${GEOFENCE_RADIUS}m)`);

        // Guardar última ubicación como "en base"
        try {
          await setDoc(doc(db, 'ubicaciones', docId), {
            unidad,
            patente,
            chofer,
            lat: resultado.base.lat,
            lng: resultado.base.lng,
            activo: false,
            enBase: true,
            baseNombre: resultado.base.nombre,
            timestamp: serverTimestamp(),
            checklistId: checklistId || null,
            sector: sector || 'vrac',
            hdr: hdr || null,
            updatedAt: new Date().toISOString(),
          });
          console.log('[GPS] ✅ Unidad registrada EN BASE:', resultado.base.nombre);

          // Si es distribución, limpiar el estado de GPS activo para este HDR
          if (sector === 'distribucion' && hdr) {
            localStorage.removeItem(`gps_active_hdr_${hdr}`);
            console.log('[GPS] 🏁 HDR finalizado, GPS desactivado:', hdr);
          }
        } catch (error) {
          console.error('[GPS] Error guardando en base:', error);
        }

        // Detener tracking automáticamente
        await stopTrackingInternal(true);
        return;
      }
    }

    console.log('[GPS] Intentando guardar en Firebase:', {
      collection: 'ubicaciones',
      docId,
      data: { unidad, patente, chofer, lat, lng, activo: true }
    });

    try {
      await setDoc(doc(db, 'ubicaciones', docId), {
        unidad,
        patente,
        chofer,
        lat,
        lng,
        activo: true,
        enBase: false,
        timestamp: serverTimestamp(),
        checklistId: checklistId || null,
        sector: sector || 'vrac',
        hdr: hdr || null, // Solo para distribución
        updatedAt: new Date().toISOString(),
      });

      setState(prev => ({ ...prev, lastUpdate: new Date(), error: null }));
      console.log('[GPS] ✅ Ubicación guardada exitosamente:', { docId, lat, lng, sector, hdr });
    } catch (error: any) {
      const errorMsg = error?.message || 'Error desconocido';
      console.error('[GPS] ❌ Error guardando ubicación:', error);
      console.error('[GPS] Código:', error?.code);
      console.error('[GPS] Mensaje:', errorMsg);
      setState(prev => ({ ...prev, error: `Error Firebase: ${errorMsg}` }));
    }
  };

  // Obtener ubicación actual
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  // Iniciar tracking
  const startTracking = useCallback(async (config: TrackingConfig): Promise<boolean> => {
    configRef.current = config;
    stoppedByGeofenceRef.current = false; // Reset del geofence flag

    // Verificar si geolocalización está disponible
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocalización no disponible en este dispositivo',
        hasPermission: false,
      }));
      return false;
    }

    try {
      // Solicitar permiso obteniendo la posición actual
      const position = await getCurrentPosition();

      // Permiso concedido
      setState(prev => ({
        ...prev,
        hasPermission: true,
        isTracking: true,
        error: null,
      }));

      // Activar Wake Lock
      await requestWakeLock();

      // Enviar primera ubicación
      await sendLocationToFirebase(
        position.coords.latitude,
        position.coords.longitude
      );

      // Configurar actualización cada 15 segundos
      intervalRef.current = setInterval(async () => {
        try {
          const pos = await getCurrentPosition();
          await sendLocationToFirebase(
            pos.coords.latitude,
            pos.coords.longitude
          );
        } catch (err) {
          console.error('[GPS] Error obteniendo posición:', err);
        }
      }, 15000); // 15 segundos

      // También usar watchPosition para actualizaciones en movimiento
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          await sendLocationToFirebase(
            pos.coords.latitude,
            pos.coords.longitude
          );
        },
        (err) => {
          console.error('[GPS] Error en watchPosition:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Sin cache, siempre posición fresca
        }
      );

      return true;
    } catch (error: any) {
      let errorMessage = 'Error al obtener ubicación';

      if (error.code === 1) {
        errorMessage = 'Permiso de ubicación denegado';
      } else if (error.code === 2) {
        errorMessage = 'Ubicación no disponible';
      } else if (error.code === 3) {
        errorMessage = 'Tiempo de espera agotado';
      }

      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Detener tracking
  const stopTracking = useCallback(async () => {
    // Limpiar intervalo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Limpiar watchPosition
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Marcar como inactivo en Firebase
    if (configRef.current) {
      try {
        await setDoc(doc(db, 'ubicaciones', `INT-${configRef.current.unidad}`), {
          activo: false,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('[GPS] Error marcando inactivo:', error);
      }
    }

    // Liberar Wake Lock
    await releaseWakeLock();

    setState(prev => ({
      ...prev,
      isTracking: false,
    }));

    configRef.current = null;
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
