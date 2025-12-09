import type { EstadoDocumento } from '../types/documentos';

/**
 * Calcula el estado de un documento según su fecha de vencimiento
 */
export function calcularEstadoDocumento(fechaVenc?: string): EstadoDocumento {
  if (!fechaVenc) return 'VIGENTE';

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(fechaVenc);
  vencimiento.setHours(0, 0, 0, 0);

  const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= 30) return 'POR_VENCER';
  return 'VIGENTE';
}

/**
 * Calcula días hasta el vencimiento
 */
export function diasHastaVencimiento(fechaVenc: string | undefined): number {
  if (!fechaVenc) return 999; // Valor alto para documentos sin fecha

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(fechaVenc);
  vencimiento.setHours(0, 0, 0, 0);

  return Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Formatea una fecha YYYY-MM-DD a formato legible
 */
export function formatearFecha(fecha: string | undefined): string {
  if (!fecha) return 'Sin fecha';

  const [year, month, day] = fecha.split('-');
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${parseInt(day)} de ${meses[parseInt(month) - 1]} ${year}`;
}

/**
 * Obtiene color según estado del documento
 */
export function getColorEstado(estado: EstadoDocumento): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  switch (estado) {
    case 'VIGENTE':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        badge: 'bg-emerald-500'
      };
    case 'POR_VENCER':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-500'
      };
    case 'VENCIDO':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-500'
      };
  }
}

/**
 * Genera mensaje de alerta según días restantes
 */
export function generarMensajeAlerta(tipo: string, dias: number): string {
  if (dias < 0) {
    return `${tipo} vencido hace ${Math.abs(dias)} días`;
  } else if (dias === 0) {
    return `${tipo} vence HOY`;
  } else if (dias <= 7) {
    return `${tipo} vence en ${dias} días`;
  } else {
    return `${tipo} vence en ${dias} días`;
  }
}
