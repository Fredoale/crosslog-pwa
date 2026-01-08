import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

interface CarouselSlide {
  icon: string;
  title: string;
  subtitle: string;
  gradient: string;
  onClick: () => void;
}

interface ModuloCarouselProps {
  titulo: string;
  iconoTitulo: React.ReactNode;
  slides: CarouselSlide[];
}

export function ModuloCarousel({ titulo, iconoTitulo, slides }: ModuloCarouselProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeTimer, setResumeTimer] = useState<NodeJS.Timeout | null>(null);

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
        }
      }, 7000);

      setResumeTimer(newTimer);
    }
  };

  // Manejar click del slide
  const handleSlideClick = (slideOnClick: () => void) => {
    console.log('[ModuloCarousel] Click en slide');
    slideOnClick();
    handleUserInteraction();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-gray-200">
      <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
        {iconoTitulo}
        {titulo}
      </h4>

      <div className="relative">
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
          className="rounded-lg overflow-hidden"
          style={{ paddingBottom: '28px' }}
          allowTouchMove={true}
          simulateTouch={true}
          touchRatio={1}
          threshold={10}
        >
          {slides.map((slide, index) => (
            <SwiperSlide
              key={index}
              onClick={() => {
                console.log('[ModuloCarousel] SwiperSlide click en:', slide.title);
                handleSlideClick(slide.onClick);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="w-full bg-gradient-to-br p-3 text-white rounded-lg hover:scale-105 transition-all animate-fade-in"
                style={{ background: slide.gradient, minHeight: '112px' }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={slide.icon} />
                  </svg>
                  <h5 className="text-base font-bold">{slide.title}</h5>
                  <p className="text-xs opacity-90">{slide.subtitle}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style>{`
        /* Transición Fade + Blur (iOS Style) */
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
