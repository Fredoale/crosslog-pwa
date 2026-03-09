import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
// Plugin nativo CrosslogGps (foreground service con Firebase nativo)
interface CrosslogGpsPlugin {
  startTracking(options: {
    unidad: string;
    patente: string;
    chofer: string;
    checklistId?: string;
    sector?: string;
    hdr?: string;
    odometroInicial?: number;
  }): Promise<{ success: boolean; message?: string }>;
  stopTracking(): Promise<{ success: boolean }>;
  isTracking(): Promise<{ isTracking: boolean }>;
  addListener(
    event: string,
    handler: (data: Record<string, unknown>) => void
  ): Promise<{ remove: () => void }>;
}

const CrosslogGps = registerPlugin<CrosslogGpsPlugin>('CrosslogGps');

// ============================================================
// BASES CROSSLOG (geofence)
// ============================================================
const BASES_CROSSLOG = [
  {
    id: 'los-cardales',
    lat: -34.36014566238795,
    lng: -59.00991328060013,
    nombre: 'Base Los Cardales',
  },
  {
    id: 'villa-maipu',
    lat: -34.56297844053954,
    lng: -58.52935080773911,
    nombre: 'Base Villa Maipú',
  },
];

const GEOFENCE_RADIUS = 100; // metros — distancia para detectar llegada a base
const DEPARTURE_THRESHOLD = 100; // metros — distancia mínima para considerar que salió de base
const IS_NATIVE = Capacitor.isNativePlatform();

// ============================================================
// HELPERS
// ============================================================
function encontrarBaseCercana(lat: number, lng: number) {
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

function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// TIPOS
// ============================================================
export interface TrackingConfig {
  unidad: string;
  patente: string;
  chofer: string;
  checklistId?: string;
  sector?: 'vrac' | 'distribucion' | 'vital_aire';
  hdr?: string;
  odometroInicial?: number;
}

interface GPSTrackingState {
  isTracking: boolean;
  hasPermission: boolean | null;
  error: string | null;
  lastUpdate: Date | null;
  arrivedAtBase: boolean;
  hasLeftBase: boolean; // true cuando la unidad se alejó más de 500m de la base
  isNative: boolean;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useGPSTracking() {
  const [state, setState] = useState<GPSTrackingState>({
    isTracking: false,
    hasPermission: null,
    error: null,
    lastUpdate: null,
    arrivedAtBase: false,
    hasLeftBase: false,
    isNative: IS_NATIVE,
  });

  // Web: ID numérico de watchPosition
  const webWatchIdRef = useRef<number | null>(null);
  const webIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nativo: handles de addListener para limpiar al desmontar
  const nativeListenersRef = useRef<Array<{ remove: () => void }>>([]);

  const configRef = useRef<TrackingConfig | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const stoppedByGeofenceRef = useRef<boolean>(false);
  const hasLeftBaseRef = useRef<boolean>(false);

  // ============================================================
  // WAKE LOCK (pantalla activa — solo web)
  // ============================================================
  const requestWakeLock = async () => {
    if (IS_NATIVE) return; // En nativo el sistema lo maneja
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[GPS] Wake Lock activado');
      }
    } catch (err) {
      console.log('[GPS] Wake Lock no disponible:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // ============================================================
  // NOTIFICACIÓN VÍA SERVICE WORKER (web) o nativa
  // ============================================================
  const mostrarNotificacionBase = (baseNombre: string, distancia: number, unidad: string) => {
    if (IS_NATIVE) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.schedule({
          notifications: [{
            title: 'CROSSLOG RUTA',
            body: `INT-${unidad} EN BASE`,
            id: Date.now(),
          }]
        });
      }).catch(e => console.log('[GPS] LocalNotifications no disponible:', e));
      return;
    }
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'GPS_NOTIFICACION',
        titulo: 'CROSSLOG RUTA',
        cuerpo: `INT-${unidad} EN BASE`,
        tag: 'crosslog-gps-base',
      });
    }
  };

  const mostrarNotificacionSalida = (unidad: string) => {
    if (IS_NATIVE) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.schedule({
          notifications: [{
            title: 'CROSSLOG RUTA',
            body: `INT-${unidad} EN RUTA`,
            id: Date.now(),
          }]
        });
      }).catch(e => console.log('[GPS] LocalNotifications no disponible:', e));
      return;
    }
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'GPS_NOTIFICACION',
        titulo: 'CROSSLOG RUTA',
        cuerpo: `INT-${unidad} EN RUTA`,
        tag: 'crosslog-gps-salida',
      });
    }
  };

  // ============================================================
  // ENVIAR UBICACIÓN A FIREBASE (compartido web + nativo)
  // ============================================================
  const sendLocationToFirebase = useCallback(async (lat: number, lng: number) => {
    if (!configRef.current || stoppedByGeofenceRef.current) return;

    const { unidad, patente, chofer, checklistId, sector, hdr } = configRef.current;
    const docId = `INT-${unidad}`;

    // Verificar geofence
    const resultado = encontrarBaseCercana(lat, lng);
    if (resultado) {
      console.log(`[GPS] Distancia a ${resultado.base.nombre}: ${resultado.distancia.toFixed(0)}m`);

      // Detectar salida de base (primera vez que se aleja > 500m)
      if (!hasLeftBaseRef.current && resultado.distancia > DEPARTURE_THRESHOLD) {
        hasLeftBaseRef.current = true;
        setState(prev => ({ ...prev, hasLeftBase: true }));
        console.log(`[GPS] 🚀 Unidad salió de base (${resultado.distancia.toFixed(0)}m) — monitoring activo`);
        mostrarNotificacionSalida(unidad);
      }

      // Solo detectar llegada si primero salió de base
      if (hasLeftBaseRef.current && resultado.distancia <= GEOFENCE_RADIUS) {
        console.log(`[GPS] 🎯 ¡Llegó a ${resultado.base.nombre}!`);

        try {
          await setDoc(doc(db, 'ubicaciones', docId), {
            unidad, patente, chofer,
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

          if (sector === 'distribucion' && hdr) {
            localStorage.removeItem(`gps_active_hdr_${hdr}`);
          }
        } catch (error) {
          console.error('[GPS] Error guardando en base:', error);
        }

        mostrarNotificacionBase(resultado.base.nombre, resultado.distancia, unidad);
        await stopTrackingInternal(true);
        return;
      }
    }

    try {
      await setDoc(doc(db, 'ubicaciones', docId), {
        unidad, patente, chofer,
        lat, lng,
        activo: true,
        enBase: false,
        timestamp: serverTimestamp(),
        checklistId: checklistId || null,
        sector: sector || 'vrac',
        hdr: hdr || null,
        updatedAt: new Date().toISOString(),
      });

      setState(prev => ({ ...prev, lastUpdate: new Date(), error: null }));
      console.log('[GPS] ✅ Ubicación guardada:', { docId, lat, lng });
    } catch (error: any) {
      console.error('[GPS] ❌ Error guardando:', error?.message);
      setState(prev => ({ ...prev, error: `Error Firebase: ${error?.message}` }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // DETENER TRACKING INTERNO (geofence o manual)
  // ============================================================
  const stopTrackingInternal = async (marcarEnBase: boolean = false) => {
    if (stoppedByGeofenceRef.current) return;
    stoppedByGeofenceRef.current = true;

    if (IS_NATIVE) {
      // Limpiar listeners JS
      nativeListenersRef.current.forEach(l => l.remove());
      nativeListenersRef.current = [];
      if (!marcarEnBase) {
        // Si no fue por geofence, el servicio aún corre: detenerlo
        try {
          await CrosslogGps.stopTracking();
        } catch (e) {
          console.error('[GPS] Error deteniendo servicio nativo:', e);
        }
      }
      // Si marcarEnBase=true: el servicio ya llamó stopSelf() y escribió Firebase
    } else {
      // Detener web
      if (webIntervalRef.current) {
        clearInterval(webIntervalRef.current);
        webIntervalRef.current = null;
      }
      if (webWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
        webWatchIdRef.current = null;
      }
      await releaseWakeLock();
    }

    if (configRef.current && marcarEnBase) {
      try {
        await setDoc(doc(db, 'ubicaciones', `INT-${configRef.current.unidad}`), {
          activo: false,
          enBase: true,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('[GPS] Error marcando en base:', error);
      }
    }

    setState(prev => ({ ...prev, isTracking: false, arrivedAtBase: marcarEnBase }));
  };

  // ============================================================
  // INICIAR TRACKING NATIVO (CrosslogGpsService via plugin)
  // El servicio escribe Firebase directamente desde Java.
  // JS solo escucha eventos para actualizar la UI.
  // ============================================================
  const startTrackingNative = async (): Promise<boolean> => {
    try {
      // 1. Solicitar permisos de ubicación
      const permResult = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      const granted = permResult.location === 'granted' || permResult.coarseLocation === 'granted';

      if (!granted) {
        setState(prev => ({ ...prev, hasPermission: false, error: 'Permiso de ubicación denegado' }));
        return false;
      }

      setState(prev => ({ ...prev, hasPermission: true }));

      // 2. Solicitar permisos de notificaciones (Android 13+)
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions();
      }).catch(() => {});

      // 3. Iniciar el foreground service nativo (escribe Firebase directamente)
      const config = configRef.current!;
      await CrosslogGps.startTracking({
        unidad:           config.unidad,
        patente:          config.patente,
        chofer:           config.chofer,
        checklistId:      config.checklistId || '',
        sector:           config.sector || 'vrac',
        hdr:              config.hdr || '',
        odometroInicial:  config.odometroInicial ?? 0,
      });

      // 4. Escuchar GPS_SALIDA para actualizar UI (servicio ya notificó en barra)
      const salidaListener = await CrosslogGps.addListener(
        'GPS_SALIDA',
        () => {
          hasLeftBaseRef.current = true;
          setState(prev => ({ ...prev, hasLeftBase: true }));
          console.log('[GPS Nativo] 🚀 GPS_SALIDA — unidad salió de base');
        }
      );

      // 5. Escuchar GPS_BASE (el servicio ya guardó Firebase y llamó stopSelf)
      const baseListener = await CrosslogGps.addListener(
        'GPS_BASE',
        (data) => {
          console.log('[GPS Nativo] 🎯 GPS_BASE — llegó a', data['baseNombre']);
          nativeListenersRef.current.forEach(l => l.remove());
          nativeListenersRef.current = [];
          stoppedByGeofenceRef.current = true;
          setState(prev => ({ ...prev, isTracking: false, arrivedAtBase: true }));
        }
      );

      nativeListenersRef.current = [salidaListener, baseListener];
      setState(prev => ({ ...prev, isTracking: true, error: null }));
      console.log('[GPS Nativo] ✅ Foreground service iniciado — Firebase nativo activo');
      return true;
    } catch (error: any) {
      console.error('[GPS Nativo] Error iniciando:', error);
      setState(prev => ({ ...prev, hasPermission: false, error: error?.message || 'Error GPS nativo' }));
      return false;
    }
  };

  // ============================================================
  // INICIAR TRACKING WEB (navigator.geolocation)
  // ============================================================
  const startTrackingWeb = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalización no disponible', hasPermission: false }));
      return false;
    }

    try {
      // Obtener posición inicial (solicita permiso implícitamente)
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setState(prev => ({ ...prev, hasPermission: true, isTracking: true, error: null }));
      await requestWakeLock();
      await sendLocationToFirebase(position.coords.latitude, position.coords.longitude);

      // Actualización periódica cada 10 segundos
      webIntervalRef.current = setInterval(async () => {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
            });
          });
          if (pos.coords.accuracy > 50) {
            console.warn(`[GPS Web] Punto descartado — accuracy: ${pos.coords.accuracy.toFixed(0)}m`);
            return;
          }
          await sendLocationToFirebase(pos.coords.latitude, pos.coords.longitude);
        } catch (err) {
          console.error('[GPS Web] Error obteniendo posición:', err);
        }
      }, 10000);

      // watchPosition para actualizaciones en movimiento
      webWatchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          if (pos.coords.accuracy > 50) {
            console.warn(`[GPS Web] watchPosition descartado — accuracy: ${pos.coords.accuracy.toFixed(0)}m`);
            return;
          }
          await sendLocationToFirebase(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error('[GPS Web] Error watchPosition:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      return true;
    } catch (error: any) {
      let msg = 'Error al obtener ubicación';
      if (error.code === 1) msg = 'Permiso de ubicación denegado';
      else if (error.code === 2) msg = 'Ubicación no disponible';
      else if (error.code === 3) msg = 'Tiempo de espera agotado';
      setState(prev => ({ ...prev, hasPermission: false, error: msg }));
      return false;
    }
  };

  // ============================================================
  // API PÚBLICA: startTracking
  // ============================================================
  const startTracking = useCallback(async (config: TrackingConfig): Promise<boolean> => {
    configRef.current = config;
    stoppedByGeofenceRef.current = false;
    hasLeftBaseRef.current = false;
    setState(prev => ({ ...prev, hasLeftBase: false, arrivedAtBase: false }));

    console.log(`[GPS] Iniciando tracking — modo: ${IS_NATIVE ? 'NATIVO' : 'WEB'}`);

    if (IS_NATIVE) {
      return startTrackingNative();
    } else {
      return startTrackingWeb();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // API PÚBLICA: stopTracking
  // ============================================================
  const stopTracking = useCallback(async () => {
    if (IS_NATIVE) {
      nativeListenersRef.current.forEach(l => l.remove());
      nativeListenersRef.current = [];
      try {
        await CrosslogGps.stopTracking();
      } catch (e) {
        console.error('[GPS] Error deteniendo servicio nativo:', e);
      }
    } else {
      if (webIntervalRef.current) {
        clearInterval(webIntervalRef.current);
        webIntervalRef.current = null;
      }
      if (webWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
        webWatchIdRef.current = null;
      }
      await releaseWakeLock();
    }

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

    configRef.current = null;
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  // ============================================================
  // CLEANUP AL DESMONTAR
  // ============================================================
  useEffect(() => {
    return () => {
      // Limpiar GPS web siempre
      if (webIntervalRef.current) clearInterval(webIntervalRef.current);
      if (webWatchIdRef.current !== null) navigator.geolocation.clearWatch(webWatchIdRef.current);
      // GPS nativo: limpiar listeners (el foreground service sigue corriendo aunque el componente se desmonte)
      nativeListenersRef.current.forEach(l => l.remove());
      releaseWakeLock();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
