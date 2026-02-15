Glosario de Elementos Web:

  Elementos de Interfaz:
  - Modal: Ventana emergente que aparece sobre el contenido principal
  - Tab: Pestaña que permite cambiar entre diferentes vistas/secciones
  - Header: Encabezado o cabecera de una sección
  - Footer: Pie de página o parte inferior de un componente
  - Button: Botón clicable
  - Badge: Etiqueta pequeña que muestra información (ej: prioridad, estado)
  - Card: Tarjeta que contiene información
  - Dropdown: Menú desplegable
  - Input: Campo de entrada de texto
  - Textarea: Campo de entrada de texto multilínea
  - Checkbox: Casilla de verificación
  - Radio Button: Botón de opción (solo una selección)
  - Select: Lista de selección desplegable
  - Icon: Ícono gráfico
  - Tooltip: Mensaje que aparece al pasar el mouse
  - Alert: Mensaje de alerta/notificación
  - Toast: Notificación temporal que aparece brevemente
  - Kanban Board: Tablero de tareas organizadas en columnas
  - Grid: Rejilla/cuadrícula de elementos
  - Sidebar: Barra lateral
  - Navbar: Barra de navegación

  Códigos de Colores Utilizados:

  Tema Principal:
  - bg-[#1a2332] - Azul oscuro/gris oscuro (fondo principal - login/headers)
  - bg-[#252f42] - Azul oscuro más claro (hover para #1a2332)

  Crosslog Brand:
  - bg-[#56ab2f] - Verde Crosslog oscuro
  - bg-[#a8e063] - Verde Crosslog claro
  - bg-[#f0f9e8] - Verde Crosslog muy claro (fondo)
  - from-[#56ab2f] to-[#a8e063] - Gradiente verde Crosslog

  Colores de Estado:
  - bg-red-500 / bg-red-600 - Rojo (errores, eliminar, urgente)
  - bg-green-100 / bg-green-600 - Verde (éxito, completado)
  - bg-yellow-100 / bg-amber-500 - Amarillo/Ámbar (advertencia, pendiente)
  - bg-blue-100 / bg-blue-500 - Azul (información, en proceso)
  - bg-purple-100 / bg-purple-500 - Morado (decorativo)
  - bg-gray-50 / bg-gray-100 / bg-gray-200 - Grises (fondos, bordes)

  Bordes:
  - border-gray-200 / border-gray-300 - Bordes grises
  - border-[#a8e063] - Borde verde Crosslog

  🎨 EFECTOS VISUALES DE LA PÁGINA DE INICIO

  1. EFECTOS AL ENTRAR A LA PÁGINA

  - animate-fade-in: Animación de aparición gradual al cargar la página completa
  - Gradiente de fondo: bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 (gradiente de gris a verde claro)

  ---
  2. BANNER DE BIENVENIDA

  "Bienvenido al Portal Crosslog"
  Efectos:
  - Gradiente de fondo: from-[#56ab2f] to-[#a8e063] (verde Crosslog)
  - Sombra: shadow-xl (sombra extra grande)
  - Bordes redondeados: rounded-2xl
  - Padding responsivo: p-6 sm:p-8

  ---
  3. CARDS DE ACCESO RÁPIDO (Búsqueda, Indicadores, Marketplace)

  Efectos al pasar el mouse (hover):
  - hover:border-[#a8e063]: Borde verde Crosslog al pasar mouse
  - hover:shadow-xl: Aumento de sombra
  - transition-all: Transición suave de todos los cambios

  Iconos dentro de las cards:
  - group-hover:scale-110: Los íconos crecen 10% al pasar el mouse sobre la card
  - transition-transform: Transición suave del crecimiento
  - Gradientes en íconos:
    - Búsqueda: from-blue-500 to-blue-600
    - Indicadores: from-green-500 to-green-600
    - Marketplace: from-orange-500 to-orange-600

  ---
  4. CARRUSELES DE MÓDULOS ⭐ (3 carruseles)

  Hay 3 carruseles automáticos usando Swiper.js:
  1. Operaciones (📊)
  2. Mantenimiento (🔧)
  3. Administración (⚙️)

  Efectos del Carrusel:

  A. Animación Automática:

  - Autoplay: Cambia de slide cada 5 segundos (delay: 5000)
  - Loop infinito: loop: true (vuelve al inicio automáticamente)
  - Pausa al hover: pauseOnMouseEnter: true (se detiene al pasar el mouse)
  - Reanudación automática: Después de 7 segundos de inactividad, vuelve a rotar

  B. Animación de Transición (iOS Style):

  @keyframes fadeBlur {
    from {
      opacity: 0;
      filter: blur(10px);  ← EFECTO BLUR
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }
  - Fade + Blur: Al cambiar de slide, aparece con desenfoque que se aclara (estilo iOS)
  - Duración: 0.5 segundos

  C. Efectos al Hover:

  - hover:scale-105: Los slides crecen 5% al pasar el mouse
  - transition-all: Transición suave

  D. Paginación (Bullets):

  - Bullets inactivos: Círculos grises pequeños (6px)
  - Bullet activo:
    - Se alarga a 20px de ancho
    - Gradiente verde Crosslog: from-[#a8e063] to-[#56ab2f]
    - Transición suave de 0.3s

  E. Touch/Swipe:

  - Deslizable en móvil: allowTouchMove: true
  - Umbral de deslizamiento: 10px para iniciar el swipe

  ---
  5. TABS DE NAVEGACIÓN (Inicio, Operaciones, Admin, Recursos)

  Efectos:
  - Tab activa:
    - Gradiente verde: from-[#56ab2f] to-[#a8e063]
    - Texto blanco
    - Sombra: shadow-sm
  - Tab inactiva:
    - Fondo gris: bg-gray-100
    - hover:bg-gray-200: Se oscurece al pasar mouse
  - transition-all: Transición suave entre estados

  ---
  6. CARDS DE RECURSOS (Manual Choferes, Panel Admin, QR Codes, Marketplace Config)

  Efectos:
  - hover:shadow-2xl: Sombra aumenta dramáticamente al hover
  - transition-all: Transición suave
  - Bordes: border border-gray-100

  Iconos en las cards:
  - group-hover:scale-110: Crecen 10% al hover de la card
  - transition-transform: Transición suave
  - Gradientes por tipo:
    - Manual: from-blue-500 to-indigo-600
    - Admin: from-purple-500 to-pink-600
    - QR: from-green-500 to-emerald-600
    - Marketplace: from-orange-500 to-orange-600

  Botones:
  - active:scale-95: Se encoge ligeramente al hacer click
  - hover:from-...: Gradiente cambia al hover
  - transition-all: Transición suave

  ---
  7. BOTONES Y ELEMENTOS INTERACTIVOS

  Efectos comunes:
  - hover:text-white: Cambio de color de texto
  - transition-colors: Transición suave de colores
  - active:scale-95: Efecto de "presión" al hacer click
  - Sombras dinámicas: shadow-lg hover:shadow-xl

  ---
  8. SPINNERS DE CARGA

  - animate-spin: Rotación infinita del ícono de carga
  - Usado durante búsquedas y operaciones

  ---
  9. GRADIENTES UTILIZADOS

  | Elemento         | Gradiente                                    |
  |------------------|----------------------------------------------|
  | Banner Principal | from-[#56ab2f] to-[#a8e063] (Verde Crosslog) |
  | Fondo General    | from-gray-50 via-green-50 to-emerald-50      |
  | Tabs Activas     | from-[#56ab2f] to-[#a8e063]                  |
  | Botones Búsqueda | from-blue-600 to-indigo-600                  |
  | Botones Admin    | from-purple-500 to-pink-600                  |
  | Botones QR       | from-green-600 to-emerald-600                |

  ---
  📋 RESUMEN DE EFECTOS PRINCIPALES:

  ✅ Carrusel automático con rotación cada 5 segundos
  ✅ Animación Fade + Blur estilo iOS al cambiar slides
  ✅ Hover scale (crecimiento) en íconos y cards
  ✅ Transiciones suaves en todos los elementos
  ✅ Gradientes dinámicos en botones e íconos
  ✅ Active scale (efecto de presión) al hacer click
  ✅ Paginación animada con bullets que se alargan
  ✅ Pausa inteligente del carrusel al interactuar
  ✅ Sombras dinámicas que aumentan al hover
  ✅ Fade-in al cargar la página completa