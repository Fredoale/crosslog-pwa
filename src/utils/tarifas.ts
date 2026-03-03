// Tarifario Distribución — nombre de ruta → km de referencia
export interface TarifaEntry { ruta: string; cliente: string; km: number; }

export const TARIFARIO_DIST: TarifaEntry[] = [
  { ruta: 'Reparto',              cliente: 'ECOLAB',        km: 17 },
  { ruta: 'Bahía Blanca',         cliente: 'ECOLAB',        km: 1365 },
  { ruta: 'Baradero',             cliente: 'ECOLAB/TOYOTA', km: 203 },
  { ruta: 'Bernal',               cliente: 'ECOLAB',        km: 170 },
  { ruta: 'Cañuelas',             cliente: 'ECOLAB',        km: 189 },
  { ruta: 'Chacabuco',            cliente: 'ECOLAB',        km: 339 },
  { ruta: 'Chascomús',            cliente: 'ECOLAB',        km: 384 },
  { ruta: 'Córdoba Extendido',    cliente: 'ECOLAB',        km: 1300 },
  { ruta: 'Coronel Suárez',       cliente: 'ECOLAB',        km: 1096 },
  { ruta: 'Junín',                cliente: 'ECOLAB',        km: 448 },
  { ruta: 'Magdalena',            cliente: 'ECOLAB',        km: 337 },
  { ruta: 'PGSM',                 cliente: 'ECOLAB',        km: 562 },
  { ruta: 'San Andrés de Giles',  cliente: 'ECOLAB',        km: 125 },
  { ruta: 'San Nicolás',          cliente: 'ECOLAB',        km: 378 },
  { ruta: 'Santa Fe Extendido',   cliente: 'ECOLAB',        km: 800 },
  { ruta: 'Zárate',               cliente: 'TOYOTA',        km: 82 },
  { ruta: 'Zárate Generales',     cliente: 'TOYOTA',        km: 82 },
  { ruta: 'Esteban Echeverría',   cliente: 'TOYOTA',        km: 182 },
  { ruta: 'La Plata',             cliente: 'TOYOTA',        km: 247 },
  { ruta: 'La Plata Generales',   cliente: 'TOYOTA',        km: 247 },
  { ruta: 'Reparto Generales',    cliente: 'TOYOTA',        km: 179 },
  { ruta: 'Lezama',               cliente: 'ECOLAB',        km: 455 },
  { ruta: 'Tandil',               cliente: 'ECOLAB',        km: 840 },
  { ruta: 'MER/COP/YPF',          cliente: 'HALLIBURTON',   km: 475 },
  { ruta: 'DON/YPF',              cliente: 'HALLIBURTON',   km: 337 },
  { ruta: 'DON/MER',              cliente: 'HALLIBURTON',   km: 250 },
  { ruta: 'San Luis',             cliente: 'ECOLAB',        km: 1373 },
  { ruta: 'Mendoza',              cliente: 'ECOLAB',        km: 2058 },
  { ruta: 'COP/YPF/COP',          cliente: 'HALLIBURTON',   km: 375 },
  { ruta: 'DON/COP/YPF/COP',      cliente: 'HALLIBURTON',   km: 470 },
];

export function buscarTarifa(kmRecorridos: number): TarifaEntry | null {
  const TOL = 0.15;
  return TARIFARIO_DIST.find(t => kmRecorridos >= t.km * (1 - TOL) && kmRecorridos <= t.km * (1 + TOL)) ?? null;
}
