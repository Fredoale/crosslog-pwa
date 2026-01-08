import { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

export type SectorType = 'distribucion' | 'vrac' | 'vital-aire' | 'taller' | 'combustible';

interface CarouselSectorProps {
  onSectorChange: (sector: SectorType) => void;
  onHDRChange?: (hdr: string) => void;
  onUnidadChange?: (unidad: string) => void;
  onCisternaChange?: (cisterna: string) => void;
  onCodigoTallerChange?: (codigo: string) => void;
  hdrValue?: string;
  unidadValue?: string;
  cisternaValue?: string;
  codigoTallerValue?: string;
  disabled?: boolean;
}

// Unidades disponibles por sector (actualizadas 10/12/2025)
export const UNIDADES_VRAC = [
  { numero: '40', patente: 'AB934JF' },
  { numero: '41', patente: 'AB152AZ' },
  { numero: '48', patente: 'AC531CX' },
  { numero: '50', patente: 'AD611OK' },
  { numero: '802', patente: 'AE069SN' },
  { numero: '805', patente: 'AE936JF' },
  { numero: '806', patente: 'AF254MJ' },
  { numero: '810', patente: 'AF894TS' },
  { numero: '812', patente: 'AG835OX' },
  { numero: '814', patente: 'AG994AW' },
  { numero: '815', patente: 'AH676AV' },
];

// Cisternas para VRAC (actualizadas 11/12/2025)
export const CISTERNAS_VRAC = [
  { numero: '532', patente: 'STF788' },
  { numero: '535', patente: 'STF787' },
  { numero: '537', patente: 'SMZ040' },
  { numero: '548', patente: 'SJU171' },
  { numero: '552', patente: 'BML932' },
  { numero: '603', patente: 'FQQ503' },
  { numero: '703', patente: 'CLD321' },
  { numero: '711', patente: 'PKY856' },
  { numero: '712', patente: 'PKY880' },
  { numero: '715', patente: 'AD179Pc' },
  { numero: '721', patente: 'AG831SJ' },
];

export const UNIDADES_VITAL_AIRE = [
  { numero: '52', patente: 'AA279FE' },
  { numero: '53', patente: 'AC823TK' },
  { numero: '55', patente: 'MYN849' },
  { numero: '56', patente: 'AC823XZ' },
  { numero: '59', patente: 'KSZ061' },
  { numero: '801', patente: 'AE052TW' },
  { numero: '808', patente: 'AF313QP' },
  { numero: '811', patente: 'AG705RB' },
  { numero: '816', patente: 'AH506IC' },
  { numero: '817', patente: 'AH506ID' },
];
export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
  { numero: '816', patente: 'AH506IC' },
];

// Todas las unidades para Carga de Combustible (VRAC + VITAL_AIRE + DISTRIBUCION)
// Nota: Se combinan eliminando duplicados (41, 816, 817 están en múltiples listas)
export const TODAS_LAS_UNIDADES = [
  // VRAC
  { numero: '40', patente: 'AB934JF' },
  { numero: '41', patente: 'AB152AZ' },
  { numero: '48', patente: 'AC531CX' },
  { numero: '50', patente: 'AD611OK' },
  { numero: '802', patente: 'AE069SN' },
  { numero: '805', patente: 'AE936JF' },
  { numero: '806', patente: 'AF254MJ' },
  { numero: '810', patente: 'AF894TS' },
  { numero: '812', patente: 'AG835OX' },
  { numero: '814', patente: 'AG994AW' },
  { numero: '815', patente: 'AH676AV' },
  // VITAL AIRE
  { numero: '52', patente: 'AA279FE' },
  { numero: '53', patente: 'AC823TK' },
  { numero: '55', patente: 'MYN849' },
  { numero: '56', patente: 'AC823XZ' },
  { numero: '59', patente: 'KSZ061' },
  { numero: '801', patente: 'AE052TW' },
  { numero: '808', patente: 'AF313QP' },
  { numero: '811', patente: 'AG705RB' },
  { numero: '816', patente: 'AH506IC' },
  { numero: '817', patente: 'AH506ID' },
  // DISTRIBUCION (solo las que no están arriba)
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
];

export function CarouselSector({
  onSectorChange,
  onHDRChange,
  onUnidadChange,
  onCisternaChange,
  onCodigoTallerChange,
  hdrValue = '',
  unidadValue = '',
  cisternaValue = '',
  codigoTallerValue = '',
  disabled = false
}: CarouselSectorProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [currentSector, setCurrentSector] = useState<SectorType>('distribucion');
  const [isPaused, setIsPaused] = useState(false);
  const [resumeTimer, setResumeTimer] = useState<NodeJS.Timeout | null>(null);

  // Resetear selecciones cuando cambia el sector
  useEffect(() => {
    console.log('[Carousel] Sector cambió a:', currentSector, '- Reseteando selecciones');
    // Limpiar HDR cuando no es distribución
    if (currentSector !== 'distribucion' && hdrValue) {
      onHDRChange?.('');
    }
    // Limpiar unidad y cisterna cuando no es vrac/vital-aire/combustible
    if (currentSector === 'distribucion' || currentSector === 'taller') {
      if (unidadValue) onUnidadChange?.('');
      if (cisternaValue) onCisternaChange?.('');
    }
    // Limpiar cisterna cuando no es vrac
    if ((currentSector === 'vital-aire' || currentSector === 'combustible') && cisternaValue) {
      onCisternaChange?.('');
    }
    // Limpiar código taller cuando no es taller
    if (currentSector !== 'taller' && codigoTallerValue) {
      onCodigoTallerChange?.('');
    }
  }, [currentSector]);

  // Handle slide change (funciona con loop habilitado)
  const handleSlideChange = (swiper: SwiperType) => {
    const sectorMap: SectorType[] = ['distribucion', 'vrac', 'vital-aire', 'taller', 'combustible'];
    // Usar realIndex en lugar de activeIndex para loop correcto
    const realIndex = swiper.realIndex;
    const newSector = sectorMap[realIndex];

    // Solo actualizar si cambió el sector
    if (newSector !== currentSector) {
      setCurrentSector(newSector);
      onSectorChange(newSector);
    }
  };

  // Detener autoplay y reanudar después de 7 segundos de inactividad
  const handleUserInteraction = () => {
    if (swiperInstance?.autoplay) {
      swiperInstance.autoplay.stop();
      setIsPaused(true);

      // Limpiar timer anterior si existe
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }

      // Reanudar después de 7 segundos
      const newTimer = setTimeout(() => {
        if (swiperInstance?.autoplay) {
          swiperInstance.autoplay.start();
          setIsPaused(false);
          console.log('[Carousel] Autoplay reanudado después de 7 segundos');
        }
      }, 7000);

      setResumeTimer(newTimer);
      console.log('[Carousel] Autoplay pausado - se reanudará en 7 segundos');
    }
  };

  // Pause autoplay on touch/mouse (temporal)
  const handleInteraction = () => {
    handleUserInteraction();
  };

  return (
    <div className="space-y-3">
      {/* Carousel */}
      <div
        className="relative"
        onTouchStart={handleInteraction}
        onMouseDown={handleInteraction}
      >
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          loop={true}
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet-custom',
            bulletActiveClass: 'swiper-pagination-bullet-active-custom',
          }}
          onSwiper={setSwiperInstance}
          onSlideChange={handleSlideChange}
          className="rounded-lg overflow-hidden"
          style={{ paddingBottom: '35px' }}
        >
          {/* DISTRIBUCIÓN */}
          <SwiperSlide>
            <div className="bg-gradient-to-r from-[#a8e063] to-[#56ab2f] p-4 text-white text-center rounded-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">📦</div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">DISTRIBUCIÓN</h3>
                  <p className="text-xs opacity-90">Para fleteros y choferes propios</p>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* VRAC */}
          <SwiperSlide>
            <div className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] p-4 text-white text-center rounded-lg shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">🛢️</div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">VRAC CISTERNAS</h3>
                  <p className="text-xs opacity-90">AIR LIQUIDE</p>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* VITAL AIRE */}
          <SwiperSlide>
            <div className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] p-4 text-white text-center rounded-lg shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">🚐</div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">VITAL AIRE</h3>
                  <p className="text-xs opacity-90">Camionetas</p>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* TALLER */}
          <SwiperSlide>
            <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] p-4 text-white text-center rounded-lg shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">🔧</div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">TALLER</h3>
                  <p className="text-xs opacity-90">Personal de Mantenimiento</p>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* COMBUSTIBLE */}
          <SwiperSlide>
            <div className="bg-gradient-to-r from-[#0033A0] to-[#0047CC] p-4 text-white text-center rounded-lg shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">⛽</div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">COMBUSTIBLE</h3>
                  <p className="text-xs opacity-90">YPF EN RUTA</p>
                </div>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Dynamic Content based on selected sector */}
      {/* FUNCIONAMIENTO:
          - DISTRIBUCIÓN: Ingresa HDR (valida con Google Sheets)
          - VRAC: Selecciona unidad INT para checklist
          - VITAL AIRE: Selecciona unidad para checklist
      */}
      <div key={currentSector}>
        {currentSector === 'distribucion' && (
          <div className="animate-fade-in">
            <label htmlFor="hdr-input" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
              Número de HDR
            </label>
            <input
              type="text"
              id="hdr-input"
              value={hdrValue}
              onChange={(e) => {
                onHDRChange?.(e.target.value);
                // Detener autoplay si el usuario escribe
                if (e.target.value.length > 0) {
                  handleUserInteraction();
                }
              }}
              className="w-full px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: '#e5e7eb',
                color: '#1a2332',
                backgroundColor: disabled ? '#fafafa' : '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#a8e063';
                e.target.style.boxShadow = '0 0 0 3px rgba(168, 224, 99, 0.1)';
                handleUserInteraction();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Ingrese número de HDR"
              disabled={disabled}
              autoComplete="off"
            />
            <p className="text-xs mt-1 text-gray-500">
              El chofer y fecha se cargan automáticamente
            </p>
          </div>
        )}

        {currentSector === 'vrac' && (
          <div className="animate-fade-in space-y-3">
            {/* Selector de Unidad INT */}
            <div>
              <label htmlFor="unidad-vrac" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
                Seleccione Unidad Interna
              </label>
              <select
                id="unidad-vrac"
                value={unidadValue}
                onChange={(e) => {
                  onUnidadChange?.(e.target.value);
                  // Detener autoplay al seleccionar
                  if (e.target.value) {
                    handleUserInteraction();
                  }
                }}
                className="w-full px-3 py-2.5 md:px-4 md:py-3 text-base md:text-lg font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed select-android-friendly"
                style={{
                  borderColor: '#e5e7eb',
                  color: unidadValue ? '#1a2332' : '#9ca3af',
                  backgroundColor: disabled ? '#fafafa' : '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0ea5e9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  handleUserInteraction();
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={disabled}
              >
                <option value="" disabled>Seleccione unidad INT</option>
                {UNIDADES_VRAC.map((unidad) => (
                  <option key={unidad.numero} value={unidad.numero}>
                    INT-{unidad.numero} {unidad.patente}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1 text-gray-500">
                Selecciona tu unidad INT para realizar el checklist diario
              </p>
            </div>

            {/* Selector de Cisterna (aparece cuando hay unidad seleccionada) */}
            {unidadValue && (
              <div className="animate-fade-in">
                <label htmlFor="cisterna-vrac" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
                  Seleccionar Cisterna 🛢️
                </label>
                <select
                  id="cisterna-vrac"
                  value={cisternaValue}
                  onChange={(e) => {
                    onCisternaChange?.(e.target.value);
                    // Detener autoplay al seleccionar
                    if (e.target.value) {
                      handleUserInteraction();
                    }
                  }}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 text-base md:text-lg font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed select-android-friendly"
                  style={{
                    borderColor: '#e5e7eb',
                    color: cisternaValue ? '#1a2332' : '#9ca3af',
                    backgroundColor: disabled ? '#fafafa' : '#ffffff'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                    handleUserInteraction();
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={disabled}
                >
                  <option value="" disabled>Seleccione cisterna</option>
                  {CISTERNAS_VRAC.map((cisterna) => (
                    <option key={cisterna.numero} value={cisterna.numero}>
                      Cisterna {cisterna.numero} - {cisterna.patente}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1 text-gray-500">
                  Selecciona la cisterna que vas a utilizar hoy
                </p>
              </div>
            )}
          </div>
        )}

        {currentSector === 'vital-aire' && (
          <div className="animate-fade-in">
            <label htmlFor="unidad-vital" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
              Seleccione Unidad Interna
            </label>
            <select
              id="unidad-vital"
              value={unidadValue}
              onChange={(e) => {
                onUnidadChange?.(e.target.value);
                // Detener autoplay al seleccionar
                if (e.target.value) {
                  handleUserInteraction();
                }
              }}
              className="w-full px-3 py-2.5 md:px-4 md:py-3 text-base md:text-lg font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed select-android-friendly"
              style={{
                borderColor: '#e5e7eb',
                color: unidadValue ? '#1a2332' : '#9ca3af',
                backgroundColor: disabled ? '#fafafa' : '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f59e0b';
                e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
                handleUserInteraction();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              disabled={disabled}
            >
              <option value="" disabled>Seleccione unidad</option>
              {UNIDADES_VITAL_AIRE.map((unidad) => (
                <option key={unidad.numero} value={unidad.numero}>
                  Unidad {unidad.numero} - {unidad.patente}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1 text-gray-500">
              Selecciona tu camioneta para realizar el checklist diario
            </p>
          </div>
        )}

        {currentSector === 'taller' && (
          <div className="animate-fade-in">
            <label htmlFor="codigo-taller" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
              Código de Acceso al Taller
            </label>
            <input
              type="text"
              id="codigo-taller"
              value={codigoTallerValue}
              onChange={(e) => {
                onCodigoTallerChange?.(e.target.value.toUpperCase());
                // Detener autoplay si el usuario escribe
                if (e.target.value.length > 0) {
                  handleUserInteraction();
                }
              }}
              className="w-full px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: '#e5e7eb',
                color: '#1a2332',
                backgroundColor: disabled ? '#fafafa' : '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                handleUserInteraction();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Ingrese código de taller"
              disabled={disabled}
              autoComplete="off"
              maxLength={20}
            />
            <p className="text-xs mt-1 text-gray-500">
              Acceso exclusivo para personal de mantenimiento
            </p>
          </div>
        )}

        {currentSector === 'combustible' && (
          <div className="animate-fade-in">
            <label htmlFor="unidad-combustible" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
              Seleccione Unidad INT
            </label>
            <select
              id="unidad-combustible"
              value={unidadValue}
              onChange={(e) => {
                onUnidadChange?.(e.target.value);
                handleUserInteraction();
              }}
              className="select-android-friendly w-full px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: '#e5e7eb',
                color: '#1a2332',
                backgroundColor: disabled ? '#fafafa' : '#ffffff',
                fontSize: '16px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0033A0';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 51, 160, 0.1)';
                handleUserInteraction();
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
              disabled={disabled}
            >
              <option value="" disabled>Seleccione unidad INT</option>
              {TODAS_LAS_UNIDADES.sort((a, b) => a.numero.localeCompare(b.numero)).map((unidad) => (
                <option key={unidad.numero} value={unidad.numero}>
                  INT-{unidad.numero} ({unidad.patente})
                </option>
              ))}
            </select>
            <p className="text-xs mt-1 text-gray-500">
              Registro de carga de combustible para la flota
            </p>
          </div>
        )}
      </div>

      <style>{`
        /* Transición Fade + Blur (iOS Style) - Elegante y suave */
        .animate-fade-in {
          animation: fadeBlur 0.5s ease-out;
        }

        @keyframes fadeBlur {
          from {
            opacity: 0;
            filter: blur(10px);
          }
          to {
            opacity: 1;
            filter: blur(0px);
          }
        }

        /* Responsive para Android */
        .select-android-friendly {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px !important;
          overflow-y: auto;
        }

        /* Touch targets para Android (mínimo 48px) */
        @media (max-width: 768px) {
          select.select-android-friendly {
            min-height: 48px;
            font-size: 16px; /* Previene zoom automático en iOS */
          }
        }

        /* Fix para scroll en dropdown - asegurar que las opciones sean scrolleables */
        select.select-android-friendly option {
          overflow-y: auto;
        }

        /* Estilizar scrollbar del dropdown de select (verde Crosslog) */
        select::-webkit-scrollbar {
          width: 10px;
        }

        select::-webkit-scrollbar-track {
          background: #f0f9e8;
          border-radius: 4px;
        }

        select::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
          border-radius: 4px;
        }

        select::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #56ab2f 0%, #3d7a1f 100%);
        }

        /* Estilizar las opciones dentro del select */
        select option {
          padding: 12px;
          font-size: 16px;
        }

        /* Opciones con disabled (placeholder) más suaves */
        select option:disabled {
          color: #9ca3af;
          font-style: italic;
        }

        /* Mejorar legibilidad en Android */
        @media (max-width: 768px) {
          select option {
            padding: 14px;
            font-size: 16px;
            line-height: 1.5;
          }
        }

        .swiper-pagination-bullet-custom {
          width: 6px;
          height: 6px;
          background: #cbd5e1;
          opacity: 1;
          margin: 0 3px !important;
          border-radius: 50%;
          transition: all 0.3s;
        }

        .swiper-pagination-bullet-active-custom {
          background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
          width: 20px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
