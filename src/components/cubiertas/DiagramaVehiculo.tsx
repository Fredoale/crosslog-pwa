/**
 * DIAGRAMA VISUAL DE VEHÍCULO
 * Muestra el vehículo con posiciones de cubiertas interactivas
 */

import { useState } from 'react';
import type {
  ConfiguracionVehiculo,
  CubiertaEnPosicion,
  AuxilioSlot,
  EstadoDesgaste,
} from '../../types/cubiertas';
import {
  obtenerColorEstado,
  CONFIG_CUBIERTAS,
} from '../../types/cubiertas';

interface DiagramaVehiculoProps {
  configuracion: ConfiguracionVehiculo;
  cubiertas: CubiertaEnPosicion[];
  auxilios: AuxilioSlot[];
  onPosicionClick?: (posicionId: string, cubierta: CubiertaEnPosicion | null) => void;
  onAuxilioClick?: (slot: number, auxilio: AuxilioSlot) => void;
  compacto?: boolean;
  mostrarNumeros?: boolean;
}

// Componente de cubierta individual
function CubiertaSVG({
  x,
  y,
  width,
  height,
  numero,
  estado,
  esAutomatico,
  onClick,
  mostrarNumero,
  compacto,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  numero: number;
  estado: EstadoDesgaste | 'SIN_CUBIERTA';
  esAutomatico?: boolean;
  onClick?: () => void;
  mostrarNumero?: boolean;
  compacto?: boolean;
}) {
  const color = obtenerColorEstado(estado);
  const [hover, setHover] = useState(false);

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Cubierta */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={compacto ? 2 : 4}
        fill={color}
        stroke={hover ? '#1a2332' : '#374151'}
        strokeWidth={hover ? 2 : 1}
        opacity={estado === 'SIN_CUBIERTA' ? 0.4 : 1}
      />

      {/* Dibujo de la banda de rodamiento */}
      {estado !== 'SIN_CUBIERTA' && !compacto && (
        <>
          <line
            x1={x + width * 0.2}
            y1={y + height * 0.2}
            x2={x + width * 0.2}
            y2={y + height * 0.8}
            stroke="#00000030"
            strokeWidth={1}
          />
          <line
            x1={x + width * 0.5}
            y1={y + height * 0.15}
            x2={x + width * 0.5}
            y2={y + height * 0.85}
            stroke="#00000030"
            strokeWidth={1}
          />
          <line
            x1={x + width * 0.8}
            y1={y + height * 0.2}
            x2={x + width * 0.8}
            y2={y + height * 0.8}
            stroke="#00000030"
            strokeWidth={1}
          />
        </>
      )}

      {/* Número */}
      {mostrarNumero && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={compacto ? 8 : 14}
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {numero}
        </text>
      )}

      {/* Indicador de eje automático */}
      {esAutomatico && !compacto && (
        <circle
          cx={x + width - 6}
          cy={y + 6}
          r={4}
          fill="#3b82f6"
          stroke="white"
          strokeWidth={1}
        />
      )}
    </g>
  );
}

// Componente de auxilio
function AuxilioSVG({
  x,
  y,
  size,
  slot,
  tieneCubierta,
  onClick,
  compacto,
}: {
  x: number;
  y: number;
  size: number;
  slot: number;
  tieneCubierta: boolean;
  onClick?: () => void;
  compacto?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <circle
        cx={x}
        cy={y}
        r={size / 2}
        fill={tieneCubierta ? CONFIG_CUBIERTAS.COLORES.AUXILIO : '#d1d5db'}
        stroke={hover ? '#1a2332' : '#6b7280'}
        strokeWidth={hover ? 2 : 1}
        opacity={tieneCubierta ? 1 : 0.5}
      />
      {!compacto && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={10}
          fontWeight="bold"
        >
          A{slot}
        </text>
      )}
    </g>
  );
}

export function DiagramaVehiculo({
  configuracion,
  cubiertas,
  auxilios,
  onPosicionClick,
  onAuxilioClick,
  compacto = false,
  mostrarNumeros = true,
}: DiagramaVehiculoProps) {
  // Dimensiones base del viewBox (coordenadas internas del SVG)
  const anchoViewBox = compacto ? 180 : 400;
  const cubiertaW = compacto ? 14 : 30;
  const cubiertaH = compacto ? 22 : 50;
  const espacioEjes = compacto ? 35 : 80;
  const margenTop = compacto ? 10 : 30;
  const margenLateral = compacto ? 15 : 40;

  // Altura dinámica según número de ejes
  const numEjes = configuracion.ejes;
  const margenBottom = compacto ? 18 : 40; // Espacio para auxilios y etiqueta
  const altoViewBox = margenTop + (compacto ? 5 : 15) + (numEjes - 1) * espacioEjes + cubiertaH + margenBottom;

  // El SVG usa width 100% y el viewBox mantiene las proporciones
  const ancho = anchoViewBox;
  const alto = altoViewBox;

  // Calcular posición del chasis
  const chasisX = margenLateral + cubiertaW + (compacto ? 5 : 15);
  const chasisWidth = ancho - (chasisX * 2);
  const chasisY = margenTop;
  const chasisHeight = alto - margenTop * 2;

  // Función para obtener posición X de cubierta según lado y tipo
  const getPosicionX = (lado: 'IZQ' | 'DER', tipo: 'SIMPLE' | 'DUAL_EXT' | 'DUAL_INT'): number => {
    if (lado === 'IZQ') {
      if (tipo === 'SIMPLE' || tipo === 'DUAL_EXT') return margenLateral;
      return margenLateral + cubiertaW + (compacto ? 2 : 5);
    } else {
      if (tipo === 'SIMPLE' || tipo === 'DUAL_EXT') return ancho - margenLateral - cubiertaW;
      return ancho - margenLateral - cubiertaW * 2 - (compacto ? 2 : 5);
    }
  };

  // Función para obtener posición Y según eje
  const getPosicionY = (eje: number): number => {
    // El eje 1 está adelante, los demás hacia atrás
    const baseY = margenTop + (compacto ? 5 : 15);
    return baseY + (eje - 1) * espacioEjes;
  };

  // Renderizar cubiertas de un eje
  const renderizarEje = (eje: number) => {
    const cubiertasEje = cubiertas.filter(c => c.posicion.eje === eje);
    const yPos = getPosicionY(eje);

    return cubiertasEje.map((cubiertaPos) => {
      const xPos = getPosicionX(cubiertaPos.posicion.lado, cubiertaPos.posicion.tipo);

      return (
        <CubiertaSVG
          key={cubiertaPos.posicion.id}
          x={xPos}
          y={yPos}
          width={cubiertaW}
          height={cubiertaH}
          numero={cubiertaPos.posicion.numero}
          estado={cubiertaPos.estadoDesgaste}
          esAutomatico={cubiertaPos.posicion.esAutomatico}
          onClick={onPosicionClick ? () => onPosicionClick(cubiertaPos.posicion.id, cubiertaPos) : undefined}
          mostrarNumero={mostrarNumeros}
          compacto={compacto}
        />
      );
    });
  };

  // Renderizar líneas de ejes
  const renderizarLineaEje = (eje: number) => {
    const yPos = getPosicionY(eje) + cubiertaH / 2;
    const cubiertasEje = cubiertas.filter(c => c.posicion.eje === eje);
    const tieneDual = cubiertasEje.some(c => c.posicion.tipo !== 'SIMPLE');

    // Estado promedio del eje para el color de la línea
    const estados = cubiertasEje.map(c => c.estadoDesgaste);
    let colorLinea = '#22c55e'; // verde por defecto
    if (estados.includes('CRITICO')) colorLinea = '#ef4444';
    else if (estados.includes('REGULAR')) colorLinea = '#f59e0b';
    else if (estados.every(e => e === 'SIN_CUBIERTA')) colorLinea = '#9ca3af';

    const x1 = tieneDual
      ? margenLateral + cubiertaW * 2 + (compacto ? 4 : 10)
      : margenLateral + cubiertaW + (compacto ? 2 : 5);
    const x2 = tieneDual
      ? ancho - margenLateral - cubiertaW * 2 - (compacto ? 4 : 10)
      : ancho - margenLateral - cubiertaW - (compacto ? 2 : 5);

    return (
      <line
        key={`eje-${eje}`}
        x1={x1}
        y1={yPos}
        x2={x2}
        y2={yPos}
        stroke={colorLinea}
        strokeWidth={compacto ? 2 : 4}
        strokeLinecap="round"
      />
    );
  };

  // Obtener ejes únicos
  const ejes = [...new Set(cubiertas.map(c => c.posicion.eje))].sort();

  return (
    <div className="relative w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${anchoViewBox} ${altoViewBox}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto max-w-full"
        style={{ maxWidth: compacto ? '180px' : '400px' }}
      >
        {/* Fondo */}
        <rect
          x={0}
          y={0}
          width={ancho}
          height={alto}
          fill="#f3f4f6"
          rx={compacto ? 4 : 8}
        />

        {/* Chasis del vehículo */}
        <rect
          x={chasisX}
          y={chasisY}
          width={chasisWidth}
          height={chasisHeight}
          fill="white"
          stroke="#d1d5db"
          strokeWidth={1}
          rx={compacto ? 2 : 4}
        />

        {/* Cabina (parte delantera) */}
        {configuracion.tipo !== 'SEMIREMOLQUE_12' && configuracion.tipo !== 'CISTERNA' && (
          <rect
            x={chasisX + chasisWidth * 0.3}
            y={chasisY - (compacto ? 3 : 8)}
            width={chasisWidth * 0.4}
            height={compacto ? 6 : 16}
            fill="#1a2332"
            rx={compacto ? 1 : 3}
          />
        )}

        {/* Líneas de ejes */}
        {ejes.map(eje => renderizarLineaEje(eje))}

        {/* Cubiertas */}
        {ejes.map(eje => renderizarEje(eje))}

        {/* Auxilios */}
        {auxilios.length > 0 && (
          <g>
            {auxilios.map((auxilio, idx) => (
              <AuxilioSVG
                key={`auxilio-${auxilio.slot}`}
                x={chasisX + chasisWidth / 2 + (idx - (auxilios.length - 1) / 2) * (compacto ? 20 : 45)}
                y={alto - (compacto ? 12 : 25)}
                size={compacto ? 16 : 35}
                slot={auxilio.slot}
                tieneCubierta={auxilio.cubierta !== null}
                onClick={onAuxilioClick ? () => onAuxilioClick(auxilio.slot, auxilio) : undefined}
                compacto={compacto}
              />
            ))}
          </g>
        )}

        {/* Etiqueta tipo vehículo */}
        {!compacto && (
          <text
            x={ancho / 2}
            y={alto - 8}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={10}
          >
            {configuracion.nombre} - {configuracion.cubiertas} cubiertas
          </text>
        )}
      </svg>

      {/* Leyenda */}
      {!compacto && (
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CONFIG_CUBIERTAS.COLORES.BUENO }} />
            <span className="text-gray-600">&gt;6mm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CONFIG_CUBIERTAS.COLORES.REGULAR }} />
            <span className="text-gray-600">4-6mm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CONFIG_CUBIERTAS.COLORES.CRITICO }} />
            <span className="text-gray-600">&lt;4mm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CONFIG_CUBIERTAS.COLORES.SIN_CUBIERTA }} />
            <span className="text-gray-600">Vacío</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CONFIG_CUBIERTAS.COLORES.AUXILIO }} />
            <span className="text-gray-600">Auxilio</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiagramaVehiculo;
