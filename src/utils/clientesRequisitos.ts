// ============================================
// REQUISITOS POR CLIENTE/DESTINO
// ============================================

export interface ClienteRequisito {
  nombre: string;
  tipo: 'SICOP' | 'DOC_IMPRESA' | 'FOTOCOPIAS' | 'SEDRONAR' | 'HABILITACION' | 'RESTRICCION' | 'AVISO' | 'OTRO';
  descripcion: string;
  nivel: 'CRITICO' | 'IMPORTANTE' | 'INFO';
}

export const CLIENTES_REQUISITOS: Record<string, ClienteRequisito> = {
  'BALL': {
    nombre: 'BALL',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP',
    nivel: 'CRITICO'
  },
  'BALL ENVASES DE ALUMINIO - BURZACO': {
    nombre: 'BALL ENVASES DE ALUMINIO - BURZACO',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP',
    nivel: 'CRITICO'
  },
  'NESTLE': {
    nombre: 'NESTLE',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP',
    nivel: 'CRITICO'
  },
  'NESTLE - FIRMA': {
    nombre: 'NESTLE - FIRMA',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP',
    nivel: 'CRITICO'
  },
  'NESTLE - SANTO TOME': {
    nombre: 'NESTLE - SANTO TOME',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP + ALTA TEMPRANA',
    nivel: 'CRITICO'
  },
  'SOFTYS': {
    nombre: 'SOFTYS',
    tipo: 'SICOP',
    descripcion: 'REQUIERE SICOP',
    nivel: 'CRITICO'
  },
  'COPSA': {
    nombre: 'COPSA',
    tipo: 'HABILITACION',
    descripcion: 'HABILITACION HALLIBURTON - Chofer: Damian Alonso | Int: 45-809',
    nivel: 'CRITICO'
  },
  'RANELAGH': {
    nombre: 'RANELAGH',
    tipo: 'HABILITACION',
    descripcion: 'REQUIERE GCG - Habilitados: Noval, Zurita, Romero. Int: 813, 46, 45, 41, 63, 803',
    nivel: 'CRITICO'
  },
  'TERNIUM - SN NICOLAS': {
    nombre: 'TERNIUM - SN NICOLAS',
    tipo: 'DOC_IMPRESA',
    descripcion: 'DOC IMPRESA (931 + Registro, VTV, SVO)',
    nivel: 'CRITICO'
  },
  'TERNIUM': {
    nombre: 'TERNIUM',
    tipo: 'DOC_IMPRESA',
    descripcion: 'DOC IMPRESA (931 + Registro, VTV, SVO)',
    nivel: 'CRITICO'
  },
  'MURCHINSON': {
    nombre: 'MURCHINSON',
    tipo: 'FOTOCOPIAS',
    descripcion: 'FOTOCOPIAS (DNI, REGISTRO, CEDULA, VTV, CVO, LINTIN)',
    nivel: 'IMPORTANTE'
  },
  'MUCHIRSON': {
    nombre: 'MUCHIRSON',
    tipo: 'FOTOCOPIAS',
    descripcion: 'FOTOCOPIAS (DNI, REGISTRO, CEDULA, VTV, CVO, LINTIN)',
    nivel: 'IMPORTANTE'
  },
  'MURCHISON': {
    nombre: 'MURCHISON',
    tipo: 'FOTOCOPIAS',
    descripcion: 'FOTOCOPIAS (DNI, REGISTRO, CEDULA, VTV, CVO, LINTIN)',
    nivel: 'IMPORTANTE'
  },
  'VUELTA DE OBLIGADO': {
    nombre: 'VUELTA DE OBLIGADO',
    tipo: 'RESTRICCION',
    descripcion: 'SOLO A LUCAS',
    nivel: 'CRITICO'
  },
  'CT - BARRAGAN': {
    nombre: 'CT - BARRAGAN',
    tipo: 'AVISO',
    descripcion: 'Avisar a Matías de la entrega',
    nivel: 'IMPORTANTE'
  },
  'LOMA HERMOSA': {
    nombre: 'LOMA HERMOSA',
    tipo: 'RESTRICCION',
    descripcion: 'Solo para Chasis - Balancín',
    nivel: 'IMPORTANTE'
  },
  'CARGA: DEFIBA / DESCARGA: CROSSLOG SM': {
    nombre: 'CARGA: DEFIBA / DESCARGA: CROSSLOG SM',
    tipo: 'OTRO',
    descripcion: 'ARMAR CIRCO',
    nivel: 'IMPORTANTE'
  },
  'WATER TECHNOLOGIES AND SOLUTIONS': {
    nombre: 'WATER TECHNOLOGIES AND SOLUTIONS',
    tipo: 'AVISO',
    descripcion: 'Datos del chófer un día antes',
    nivel: 'IMPORTANTE'
  },
  'COFCO': {
    nombre: 'COFCO',
    tipo: 'SEDRONAR',
    descripcion: 'REQUIERE SEDRONAR',
    nivel: 'CRITICO'
  },
  'RAIZEN': {
    nombre: 'RAIZEN',
    tipo: 'RESTRICCION',
    descripcion: 'RECIBEN ANTES DE LAS 11HRS',
    nivel: 'IMPORTANTE'
  },
  'DORADO': {
    nombre: 'DORADO',
    tipo: 'RESTRICCION',
    descripcion: 'Viernes (7:30 hrs a 13 hrs)',
    nivel: 'IMPORTANTE'
  },
  'VESPRINI': {
    nombre: 'VESPRINI',
    tipo: 'AVISO',
    descripcion: 'RECORDAR A ECOLAB QUE EL CLIENTE SOLICITA UNIDADES CHICAS',
    nivel: 'INFO'
  },
  'DIREXA': {
    nombre: 'DIREXA',
    tipo: 'RESTRICCION',
    descripcion: 'DÍAS DE ENTREGA: LUNES A JUEVES DE 8 a 12:30 hs',
    nivel: 'IMPORTANTE'
  },
};

/**
 * Buscar requisitos de un cliente/destino
 */
export function buscarRequisitosCliente(nombreCliente: string): ClienteRequisito | null {
  const nombreUpper = nombreCliente.toUpperCase().trim();

  // Búsqueda exacta
  if (CLIENTES_REQUISITOS[nombreUpper]) {
    return CLIENTES_REQUISITOS[nombreUpper];
  }

  // Búsqueda parcial (si el nombre contiene alguna clave)
  for (const [clave, requisito] of Object.entries(CLIENTES_REQUISITOS)) {
    if (nombreUpper.includes(clave) || clave.includes(nombreUpper)) {
      return requisito;
    }
  }

  return null;
}

/**
 * Obtener ícono según tipo de requisito
 */
export function getIconoRequisito(tipo: ClienteRequisito['tipo']): string {
  switch (tipo) {
    case 'SICOP': return '🔒';
    case 'DOC_IMPRESA': return '📄';
    case 'FOTOCOPIAS': return '📋';
    case 'SEDRONAR': return '🚨';
    case 'HABILITACION': return '✅';
    case 'RESTRICCION': return '⏰';
    case 'AVISO': return '📢';
    case 'OTRO': return 'ℹ️';
    default: return '⚠️';
  }
}

/**
 * Obtener color según nivel de importancia
 */
export function getColorNivel(nivel: ClienteRequisito['nivel']): string {
  switch (nivel) {
    case 'CRITICO': return 'text-yellow-800 bg-yellow-50 border-yellow-400';
    case 'IMPORTANTE': return 'text-orange-700 bg-orange-50 border-orange-300';
    case 'INFO': return 'text-blue-700 bg-blue-50 border-blue-300';
    default: return 'text-gray-700 bg-gray-50 border-gray-300';
  }
}
