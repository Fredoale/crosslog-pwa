/**
 * SERVICIO DE BATERÍAS
 * Control de instalación, duración y diagnóstico eléctrico por unidad
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// TIPOS
// ============================================================================

export type SintomaFalla =
  | 'arranque_lento'
  | 'no_arranca'
  | 'descarga_rapida'
  | 'luz_tablero'
  | 'otro';

export type DiagnosticoFalla = 'bateria' | 'electrico' | 'sin_determinar';

export type EstadoBateria = 'ok' | 'baja_carga' | 'reemplazar';

export interface FallaBateria {
  id: string;
  fecha: Date;
  sintoma: SintomaFalla;
  diagnostico: DiagnosticoFalla;
  descripcion: string;
  resolucion: string;
  registradoPor: string;
}

export interface RegistroBateria {
  id: string;
  unidadNumero: string;
  marca: string;
  modelo: string;
  fechaInstalacion: Date;
  kmInstalacion: number;
  estado: EstadoBateria;
  activa: boolean;                // Solo una activa por unidad
  observaciones?: string;
  fallas: FallaBateria[];
  creadoEn: Date;
  creadoPor: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const COLECCION = 'baterias';

function docToRegistro(id: string, data: any): RegistroBateria {
  return {
    id,
    unidadNumero: data.unidadNumero,
    marca: data.marca ?? '',
    modelo: data.modelo ?? '',
    fechaInstalacion: data.fechaInstalacion?.toDate?.() ?? new Date(),
    kmInstalacion: data.kmInstalacion ?? 0,
    estado: data.estado ?? 'ok',
    activa: data.activa ?? false,
    observaciones: data.observaciones ?? '',
    fallas: (data.fallas ?? []).map((f: any, i: number) => ({
      id: f.id ?? String(i),
      fecha: f.fecha?.toDate?.() ?? new Date(),
      sintoma: f.sintoma ?? 'otro',
      diagnostico: f.diagnostico ?? 'sin_determinar',
      descripcion: f.descripcion ?? '',
      resolucion: f.resolucion ?? '',
      registradoPor: f.registradoPor ?? '',
    })),
    creadoEn: data.creadoEn?.toDate?.() ?? new Date(),
    creadoPor: data.creadoPor ?? '',
  };
}

/** Calcula meses de uso desde la instalación */
export function calcularMesesUso(fechaInstalacion: Date): number {
  const ahora = new Date();
  const meses =
    (ahora.getFullYear() - fechaInstalacion.getFullYear()) * 12 +
    (ahora.getMonth() - fechaInstalacion.getMonth());
  return Math.max(0, meses);
}

/** Indica si hay sospecha de falla eléctrica (2+ fallas con diagnóstico eléctrico) */
export function tieneAlerteElectrica(bateria: RegistroBateria): boolean {
  const fallasElectricas = bateria.fallas.filter((f) => f.diagnostico === 'electrico');
  return fallasElectricas.length >= 1;
}

/** Indica si la batería es posiblemente defectuosa (2+ fallas "bateria" en < 6 meses) */
export function bateriaDefectuosa(bateria: RegistroBateria): boolean {
  const hace6Meses = new Date();
  hace6Meses.setMonth(hace6Meses.getMonth() - 6);
  const fallasBateria = bateria.fallas.filter(
    (f) => f.diagnostico === 'bateria' && f.fecha >= hace6Meses
  );
  return fallasBateria.length >= 2;
}

// ============================================================================
// QUERIES
// ============================================================================

/** Batería activa actual de una unidad */
export async function getBateriaActiva(
  unidadNumero: string
): Promise<RegistroBateria | null> {
  const q = query(
    collection(db, COLECCION),
    where('unidadNumero', '==', unidadNumero),
    where('activa', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToRegistro(d.id, d.data());
}

/** Historial completo de baterías de una unidad (más reciente primero) */
export async function getHistorialBaterias(
  unidadNumero: string
): Promise<RegistroBateria[]> {
  const q = query(
    collection(db, COLECCION),
    where('unidadNumero', '==', unidadNumero),
    orderBy('fechaInstalacion', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRegistro(d.id, d.data()));
}

// ============================================================================
// MUTATIONS
// ============================================================================

/** Instala una nueva batería (desactiva la anterior automáticamente) */
export async function instalarBateria(
  unidadNumero: string,
  datos: {
    marca: string;
    modelo: string;
    fechaInstalacion: Date;
    kmInstalacion: number;
    observaciones?: string;
    registradoPor: string;
  }
): Promise<string> {
  // Desactivar batería anterior
  const anterior = await getBateriaActiva(unidadNumero);
  if (anterior) {
    await updateDoc(doc(db, COLECCION, anterior.id), { activa: false });
  }

  // Crear nueva batería activa
  const ref = await addDoc(collection(db, COLECCION), {
    unidadNumero,
    marca: datos.marca,
    modelo: datos.modelo,
    fechaInstalacion: Timestamp.fromDate(datos.fechaInstalacion),
    kmInstalacion: datos.kmInstalacion,
    estado: 'ok',
    activa: true,
    observaciones: datos.observaciones ?? '',
    fallas: [],
    creadoEn: serverTimestamp(),
    creadoPor: datos.registradoPor,
  });

  return ref.id;
}

/** Registra una falla en la batería activa */
export async function registrarFallaBateria(
  bateriaId: string,
  falla: Omit<FallaBateria, 'id'>
): Promise<void> {
  const ref = doc(db, COLECCION, bateriaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Batería no encontrada');

  const fallaConId: FallaBateria = {
    ...falla,
    id: crypto.randomUUID(),
    fecha: falla.fecha,
  };

  const fallasActuales: any[] = snap.data().fallas ?? [];
  await updateDoc(ref, {
    fallas: [
      ...fallasActuales,
      {
        ...fallaConId,
        fecha: Timestamp.fromDate(falla.fecha),
      },
    ],
  });
}

/** Actualiza el estado de una batería */
export async function actualizarEstadoBateria(
  bateriaId: string,
  estado: EstadoBateria
): Promise<void> {
  await updateDoc(doc(db, COLECCION, bateriaId), { estado });
}
