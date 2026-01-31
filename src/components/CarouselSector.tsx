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

  // Filtro inteligente para unidades Vital Aire
  const [filtroUnidadVitalAire, setFiltroUnidadVitalAire] = useState('');
  const [mostrarDropdownVitalAire, setMostrarDropdownVitalAire] = useState(false);

  // Filtrar unidades de Vital Aire
  const unidadesVitalAireFiltradas = UNIDADES_VITAL_AIRE.filter(u =>
    u.numero.toLowerCase().includes(filtroUnidadVitalAire.toLowerCase()) ||
    u.patente.toLowerCase().includes(filtroUnidadVitalAire.toLowerCase())
  );

  // Filtro inteligente para VRAC (unidad tractor y cisterna)
  const [filtroUnidadVRAC, setFiltroUnidadVRAC] = useState('');
  const [mostrarDropdownUnidadVRAC, setMostrarDropdownUnidadVRAC] = useState(false);
  const [filtroCisternaVRAC, setFiltroCisternaVRAC] = useState('');
  const [mostrarDropdownCisternaVRAC, setMostrarDropdownCisternaVRAC] = useState(false);

  // Filtrar unidades y cisternas de VRAC
  const unidadesVRACFiltradas = UNIDADES_VRAC.filter(u =>
    u.numero.toLowerCase().includes(filtroUnidadVRAC.toLowerCase()) ||
    u.patente.toLowerCase().includes(filtroUnidadVRAC.toLowerCase())
  );
  const cisternasVRACFiltradas = CISTERNAS_VRAC.filter(c =>
    c.numero.toLowerCase().includes(filtroCisternaVRAC.toLowerCase()) ||
    c.patente.toLowerCase().includes(filtroCisternaVRAC.toLowerCase())
  );

  // Filtro inteligente para COMBUSTIBLE (todas las unidades)
  const [filtroUnidadCombustible, setFiltroUnidadCombustible] = useState('');
  const [mostrarDropdownCombustible, setMostrarDropdownCombustible] = useState(false);

  // Filtrar todas las unidades para combustible
  const unidadesCombustibleFiltradas = TODAS_LAS_UNIDADES.filter(u =>
    u.numero.toLowerCase().includes(filtroUnidadCombustible.toLowerCase()) ||
    u.patente.toLowerCase().includes(filtroUnidadCombustible.toLowerCase())
  );

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
          <div className="animate-fade-in">
          </div>
        )}

        {currentSector === 'vital-aire' && (
          <div className="animate-fade-in">
            <label htmlFor="unidad-vital" className="block text-xs font-bold mb-1.5" style={{ color: '#1a2332' }}>
              Seleccione Unidad Interna
            </label>
            {/* Filtro inteligente UI */}
            <div className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🚐</span>
                <input
                  type="text"
                  id="unidad-vital"
                  value={unidadValue ? `INT-${unidadValue} • ${UNIDADES_VITAL_AIRE.find(u => u.numero === unidadValue)?.patente || ''}` : filtroUnidadVitalAire}
                  onChange={(e) => {
                    if (!unidadValue) {
                      setFiltroUnidadVitalAire(e.target.value);
                      setMostrarDropdownVitalAire(true);
                      handleUserInteraction();
                    }
                  }}
                  onFocus={() => {
                    if (!unidadValue) {
                      setMostrarDropdownVitalAire(true);
                    }
                    handleUserInteraction();
                  }}
                  placeholder="Buscar por INT o patente..."
                  className="w-full pl-10 pr-10 py-2.5 md:py-3 text-base md:text-lg font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: unidadValue ? '#f59e0b' : '#e5e7eb',
                    color: '#1a2332',
                    backgroundColor: unidadValue ? '#fff7ed' : (disabled ? '#fafafa' : '#ffffff')
                  }}
                  disabled={disabled || !!unidadValue}
                  readOnly={!!unidadValue}
                />
                {unidadValue ? (
                  <button
                    onClick={() => {
                      onUnidadChange?.('');
                      setFiltroUnidadVitalAire('');
                      setMostrarDropdownVitalAire(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-700 font-bold text-sm"
                    type="button"
                  >
                    Cambiar
                  </button>
                ) : filtroUnidadVitalAire && (
                  <button
                    onClick={() => {
                      setFiltroUnidadVitalAire('');
                      setMostrarDropdownVitalAire(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown de sugerencias */}
              {mostrarDropdownVitalAire && !unidadValue && filtroUnidadVitalAire.length > 0 && unidadesVitalAireFiltradas.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border-2 border-orange-200 z-50 max-h-48 overflow-y-auto">
                  {unidadesVitalAireFiltradas.map((u) => (
                    <button
                      key={u.numero}
                      onClick={() => {
                        onUnidadChange?.(u.numero);
                        setFiltroUnidadVitalAire('');
                        setMostrarDropdownVitalAire(false);
                        handleUserInteraction();
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                      type="button"
                    >
                      <div>
                        <span className="font-bold text-gray-800">INT-{u.numero}</span>
                        <span className="ml-2 text-gray-500 font-mono text-sm">{u.patente}</span>
                      </div>
                      <span className="text-orange-500">→</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sin resultados */}
              {mostrarDropdownVitalAire && !unidadValue && filtroUnidadVitalAire.length > 0 && unidadesVitalAireFiltradas.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 p-3 text-center">
                  <p className="text-gray-500 text-sm">No se encontró "{filtroUnidadVitalAire}"</p>
                </div>
              )}
            </div>
            <p className="text-xs mt-1 text-gray-500">
              Escribe para buscar entre las {UNIDADES_VITAL_AIRE.length} unidades
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
            <div className="relative">
              <input
                id="unidad-combustible"
                type="text"
                value={unidadValue ? `INT-${unidadValue} • ${TODAS_LAS_UNIDADES.find(u => u.numero === unidadValue)?.patente || ''}` : filtroUnidadCombustible}
                onChange={(e) => {
                  if (!unidadValue) {
                    setFiltroUnidadCombustible(e.target.value);
                    setMostrarDropdownCombustible(true);
                  }
                  handleUserInteraction();
                }}
                onFocus={() => {
                  if (!unidadValue) {
                    setMostrarDropdownCombustible(true);
                  }
                  handleUserInteraction();
                }}
                onBlur={() => {
                  setTimeout(() => setMostrarDropdownCombustible(false), 200);
                }}
                placeholder="Buscar por INT o patente..."
                className="w-full px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: unidadValue ? '#0033A0' : '#e5e7eb',
                  color: '#1a2332',
                  backgroundColor: unidadValue ? '#eff6ff' : (disabled ? '#fafafa' : '#ffffff'),
                  fontSize: '16px'
                }}
                disabled={disabled}
                readOnly={!!unidadValue}
              />
              {unidadValue ? (
                <button
                  type="button"
                  onClick={() => {
                    onUnidadChange?.('');
                    setFiltroUnidadCombustible('');
                    handleUserInteraction();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-blue-200 transition-colors"
                  style={{ color: '#0033A0' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : filtroUnidadCombustible && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroUnidadCombustible('');
                    handleUserInteraction();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Dropdown de resultados filtrados */}
            {mostrarDropdownCombustible && !unidadValue && filtroUnidadCombustible.length > 0 && unidadesCombustibleFiltradas.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                   style={{ left: 0, right: 0 }}>
                {unidadesCombustibleFiltradas.map((u) => (
                  <button
                    key={u.numero}
                    type="button"
                    onClick={() => {
                      onUnidadChange?.(u.numero);
                      setFiltroUnidadCombustible('');
                      setMostrarDropdownCombustible(false);
                      handleUserInteraction();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-bold text-blue-800">INT-{u.numero}</span>
                    <span className="text-gray-600 ml-2">• {u.patente}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Mensaje sin resultados */}
            {mostrarDropdownCombustible && !unidadValue && filtroUnidadCombustible.length > 0 && unidadesCombustibleFiltradas.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-3">
                <p className="text-gray-500 text-sm">No se encontro "{filtroUnidadCombustible}"</p>
              </div>
            )}
            <p className="text-xs mt-1 text-gray-500">
              Registro de carga de combustible para la flota ({TODAS_LAS_UNIDADES.length} unidades)
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
