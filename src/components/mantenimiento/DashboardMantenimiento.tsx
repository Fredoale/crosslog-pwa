/**
 * DASHBOARD MANTENIMIENTO - Panel Administrativo
 * Vista completa de checklists, novedades y órdenes de trabajo
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  where,
  Timestamp,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { ChecklistRegistro, Novedad, OrdenTrabajo, CargaCombustible, AlertaCombustible, ConsumoCombustible } from '../../types/checklist';
import { KanbanBoard } from './KanbanBoard';
import { getAllCargasCombustible, getAlertasByUnidad, getConsumoUnidad, deleteCargaCombustible } from '../../services/combustibleService';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { convertirTimestampFirebase } from '../../utils/dateUtils';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

// Función para obtener patente de una unidad usando TODAS_LAS_UNIDADES
const obtenerPatente = (numeroUnidad: string): string => {
  const unidad = TODAS_LAS_UNIDADES.find(u => u.numero === numeroUnidad);
  return unidad?.patente || 'N/A';
};

interface DashboardMantenimientoProps {
  onBack: () => void;
}

type TabType = 'checklists' | 'novedades' | 'ordenes' | 'kanban' | 'historial' | 'combustible';

interface Filtros {
  sector: '' | 'vrac' | 'vital-aire';
  unidad: string;
  fechaDesde: string;
  fechaHasta: string;
  resultado: '' | 'APTO' | 'NO_APTO' | 'PENDIENTE';
  prioridad: '' | 'ALTA' | 'MEDIA' | 'BAJA';
  estado: '' | 'PENDIENTE' | 'EN_PROCESO' | 'ESPERANDO_REPUESTOS' | 'CERRADO';
}

interface Estadisticas {
  totalChecklists: number;
  checklistsApto: number;
  checklistsNoApto: number;
  novedadesPendientes: number;
  ordenesAbiertas: number;
  ordenesEnProceso: number;
}

// ============================================================================
// MODAL CREAR NOVEDAD
// ============================================================================
interface ModalCrearNovedadProps {
  onClose: () => void;
  onCreated: () => void;
}

const ModalCrearNovedad: React.FC<ModalCrearNovedadProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unidadNumero: '',
    unidadPatente: '',
    descripcion: '',
    prioridad: 'MEDIA' as 'ALTA' | 'MEDIA' | 'BAJA',
  });
  const [imagenesEvidencia, setImagenesEvidencia] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Estado para filtro inteligente de unidad
  const [unidadBusqueda, setUnidadBusqueda] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Filtrar unidades según búsqueda
  const unidadesFiltradas = TODAS_LAS_UNIDADES.filter(u =>
    u.numero.toLowerCase().includes(unidadBusqueda.toLowerCase()) ||
    u.patente.toLowerCase().includes(unidadBusqueda.toLowerCase())
  ).slice(0, 8);

  // Seleccionar unidad del dropdown
  const seleccionarUnidad = (unidad: typeof TODAS_LAS_UNIDADES[0]) => {
    setFormData({ ...formData, unidadNumero: unidad.numero, unidadPatente: unidad.patente });
    setUnidadBusqueda(unidad.numero);
    setMostrarSugerencias(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Subir imágenes a Firebase Storage
      const urlsImagenes: string[] = [];
      for (const imagen of imagenesEvidencia) {
        const timestamp = Date.now();
        const nombreArchivo = `novedades/${formData.unidadNumero}_${timestamp}_${imagen.name}`;
        const storageRef = ref(storage, nombreArchivo);

        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenes.push(url);
      }

      const novedad: Omit<Novedad, 'id'> = {
        checklistId: '',
        itemId: '',
        fecha: new Date(),
        unidad: {
          numero: formData.unidadNumero,
          patente: formData.unidadPatente
        },
        descripcion: formData.descripcion,
        comentarioChofer: '',
        prioridad: formData.prioridad,
        estado: 'PENDIENTE',
        timestamp: new Date(),
        ...(urlsImagenes.length > 0 && { fotosEvidencia: urlsImagenes })
      };

      await addDoc(collection(db, 'novedades'), {
        ...novedad,
        fecha: serverTimestamp(),
        timestamp: serverTimestamp()
      });

      console.log('[ModalCrearNovedad] Novedad creada exitosamente con', urlsImagenes.length, 'imágenes');
      onCreated();
    } catch (error) {
      console.error('[ModalCrearNovedad] Error:', error);
      showError('Error al crear la novedad: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImagenesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validar tamaño máximo de 5MB por imagen
    const archivosValidos = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        showWarning(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        return false;
      }
      return true;
    });

    setImagenesEvidencia(prev => [...prev, ...archivosValidos]);

    // Crear previews
    archivosValidos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminarImagen = (index: number) => {
    setImagenesEvidencia(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold">Nueva Novedad</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Unidad - Filtro Inteligente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad (Número) *</label>
              <input
                type="text"
                required
                value={unidadBusqueda || formData.unidadNumero}
                onChange={(e) => {
                  setUnidadBusqueda(e.target.value);
                  setFormData({ ...formData, unidadNumero: e.target.value, unidadPatente: '' });
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Buscar unidad..."
                style={{ fontSize: '16px' }}
              />
              {/* Dropdown de sugerencias */}
              {mostrarSugerencias && unidadBusqueda && unidadesFiltradas.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-amber-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {unidadesFiltradas.map((unidad) => (
                    <button
                      key={unidad.numero}
                      type="button"
                      onClick={() => seleccionarUnidad(unidad)}
                      className="w-full px-4 py-2 text-left hover:bg-amber-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-semibold text-gray-800">{unidad.numero}</span>
                      <span className="text-sm text-gray-500">{unidad.patente}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Patente *</label>
              <input
                type="text"
                required
                value={formData.unidadPatente}
                onChange={(e) => setFormData({ ...formData, unidadPatente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
                placeholder="Se autocompleta"
                style={{ fontSize: '16px' }}
                readOnly={!!formData.unidadPatente}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción del Problema *</label>
            <textarea
              required
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Describe detalladamente el problema encontrado..."
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad *</label>
            <select
              value={formData.prioridad}
              onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              style={{ fontSize: '16px' }}
            >
              <option value="ALTA">🔴 Alta - Urgente</option>
              <option value="MEDIA">🟡 Media - Normal</option>
              <option value="BAJA">🟢 Baja - Puede esperar</option>
            </select>
          </div>

          {/* Imágenes de Evidencia */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imágenes de Evidencia (Opcional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-amber-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagenesChange}
                className="hidden"
                id="upload-novedades"
              />
              <label
                htmlFor="upload-novedades"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Click para seleccionar imágenes</span>
                <span className="text-xs text-gray-500 mt-1">Máximo 5MB por imagen</span>
              </label>
            </div>

            {/* Previews de imágenes */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarImagen(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Novedad
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL CREAR ORDEN DE TRABAJO
// ============================================================================
interface ModalCrearOrdenProps {
  onClose: () => void;
  onCreated: () => void;
}

const ModalCrearOrden: React.FC<ModalCrearOrdenProps> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unidadNumero: '',
    unidadPatente: '',
    tipo: 'CORRECTIVO' as 'PREVENTIVO' | 'CORRECTIVO' | 'URGENTE',
    descripcion: '',
    prioridad: 'MEDIA' as 'ALTA' | 'MEDIA' | 'BAJA',
  });
  const [imagenesEvidencia, setImagenesEvidencia] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Subir imágenes a Firebase Storage
      const urlsImagenes: string[] = [];
      for (const imagen of imagenesEvidencia) {
        const timestamp = Date.now();
        const nombreArchivo = `ordenes_trabajo/${formData.unidadNumero}_${timestamp}_${imagen.name}`;
        const storageRef = ref(storage, nombreArchivo);

        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenes.push(url);
      }

      // Generar número de OT
      const ordersRef = collection(db, 'ordenes_trabajo');
      const ordersSnap = await getDocs(query(ordersRef, orderBy('numeroOT', 'desc'), limit(1)));
      const ultimoNumero = ordersSnap.empty ? 0 : ordersSnap.docs[0].data().numeroOT || 0;
      const nuevoNumero = ultimoNumero + 1;

      const orden: Omit<OrdenTrabajo, 'id'> = {
        numeroOT: nuevoNumero,
        fecha: new Date(),
        unidad: {
          numero: formData.unidadNumero,
          patente: formData.unidadPatente
        },
        tipo: formData.tipo,
        descripcion: formData.descripcion,
        estado: 'PENDIENTE',
        prioridad: formData.prioridad,
        timestamp: new Date(),
        ...(urlsImagenes.length > 0 && { fotosEvidencia: urlsImagenes })
      };

      await addDoc(collection(db, 'ordenes_trabajo'), {
        ...orden,
        fecha: serverTimestamp(),
        timestamp: serverTimestamp()
      });

      console.log('[ModalCrearOrden] Orden creada exitosamente con', urlsImagenes.length, 'imágenes');
      onCreated();
    } catch (error) {
      console.error('[ModalCrearOrden] Error:', error);
      showError('Error al crear la orden de trabajo: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImagenesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validar tamaño máximo de 5MB por imagen
    const archivosValidos = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        showWarning(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        return false;
      }
      return true;
    });

    setImagenesEvidencia(prev => [...prev, ...archivosValidos]);

    // Crear previews
    archivosValidos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminarImagen = (index: number) => {
    setImagenesEvidencia(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 className="text-2xl font-bold">Nueva Orden de Trabajo</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad (Número) *</label>
              <input
                type="text"
                required
                value={formData.unidadNumero}
                onChange={(e) => setFormData({ ...formData, unidadNumero: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ej: 810"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Patente *</label>
              <input
                type="text"
                required
                value={formData.unidadPatente}
                onChange={(e) => setFormData({ ...formData, unidadPatente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ej: AA123BB"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Mantenimiento *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                style={{ fontSize: '16px' }}
              >
                <option value="PREVENTIVO">🔍 Preventivo</option>
                <option value="CORRECTIVO">🔧 Correctivo</option>
                <option value="URGENTE">⚡ Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad *</label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                style={{ fontSize: '16px' }}
              >
                <option value="ALTA">🔴 Alta - Urgente</option>
                <option value="MEDIA">🟡 Media - Normal</option>
                <option value="BAJA">🟢 Baja - Puede esperar</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción del Trabajo *</label>
            <textarea
              required
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Describe el trabajo a realizar..."
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Imágenes de Evidencia */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imágenes de Evidencia (Opcional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagenesChange}
                className="hidden"
                id="upload-ordenes"
              />
              <label
                htmlFor="upload-ordenes"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Click para seleccionar imágenes</span>
                <span className="text-xs text-gray-500 mt-1">Máximo 5MB por imagen</span>
              </label>
            </div>

            {/* Previews de imágenes */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarImagen(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Orden
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL DETALLE/EDICIÓN NOVEDAD
// ============================================================================
interface ModalDetalleNovedadProps {
  novedad: Novedad;
  onClose: () => void;
  onUpdated: () => void;
}

const ModalDetalleNovedad: React.FC<ModalDetalleNovedadProps> = ({ novedad, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState(novedad.estado);
  const [prioridad, setPrioridad] = useState(novedad.prioridad);
  const [imagenViewer, setImagenViewer] = useState<string | null>(null);

  // Estado para cargar datos de la OT asociada
  const [ordenAsociada, setOrdenAsociada] = useState<OrdenTrabajo | null>(null);

  // Cargar datos de la OT si existe
  useEffect(() => {
    const cargarOrdenAsociada = async () => {
      if (novedad.ordenTrabajoId) {
        try {
          const ordenDoc = await getDocs(query(
            collection(db, 'ordenes_trabajo'),
            where('__name__', '==', novedad.ordenTrabajoId)
          ));
          if (!ordenDoc.empty) {
            const data = ordenDoc.docs[0].data();
            setOrdenAsociada({ id: ordenDoc.docs[0].id, ...data } as OrdenTrabajo);
          }
        } catch (error) {
          console.error('[ModalDetalleNovedad] Error cargando OT:', error);
        }
      }
    };
    cargarOrdenAsociada();
  }, [novedad.ordenTrabajoId]);

  // Obtener número corto de OT
  const getNumeroOTCorto = () => {
    if (ordenAsociada?.numeroOT) {
      return String(ordenAsociada.numeroOT).slice(-5);
    }
    if (novedad.ordenTrabajoId) {
      // Extraer timestamp del ID: ot_1769767187856_xxx -> 87856
      const match = novedad.ordenTrabajoId.match(/ot_(\d+)_/);
      if (match) {
        return match[1].slice(-5);
      }
    }
    return 'N/A';
  };

  const handleActualizar = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'novedades', novedad.id), {
        estado,
        prioridad,
        timestampResuelta: estado === 'RESUELTA' ? serverTimestamp() : null
      });

      console.log('[ModalDetalleNovedad] Novedad actualizada exitosamente');
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleNovedad] Error:', error);
      showError('Error al actualizar la novedad');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta novedad? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'novedades', novedad.id));
      console.log('[ModalDetalleNovedad] Novedad eliminada:', novedad.id);
      showSuccess('Novedad eliminada exitosamente');
      onClose();
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleNovedad] Error al eliminar:', error);
      showError('Error al eliminar la novedad: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTomarNovedad = async () => {
    if (!confirm('¿Deseas crear una Orden de Trabajo para esta novedad?')) {
      return;
    }

    setLoading(true);
    try {
      const ordenTrabajoId = `ot_${Date.now()}_${novedad.id}`;

      const ordenTrabajo: OrdenTrabajo = {
        id: ordenTrabajoId,
        numeroOT: Date.now(),
        novedadId: novedad.id,
        checklistId: novedad.checklistId,
        fecha: new Date(),
        fechaCreacion: new Date(),
        unidad: novedad.unidad,
        tipo: 'CORRECTIVO',
        descripcion: `${novedad.descripcion} - ${novedad.comentarioChofer}`,
        estado: 'PENDIENTE',
        prioridad: novedad.prioridad,
        tipoMantenimiento: 'CORRECTIVO',
        timestamp: new Date(),
        // Transferir imágenes de la novedad a la OT
        ...(novedad.fotosEvidencia && novedad.fotosEvidencia.length > 0 && { fotosEvidencia: novedad.fotosEvidencia })
      };

      const ordenTrabajoData = {
        ...ordenTrabajo,
        fecha: Timestamp.fromDate(ordenTrabajo.fecha),
        fechaCreacion: Timestamp.fromDate(ordenTrabajo.fechaCreacion!),
        timestamp: Timestamp.fromDate(ordenTrabajo.timestamp)
      };

      // Crear OT
      await setDoc(doc(db, 'ordenes_trabajo', ordenTrabajoId), ordenTrabajoData);

      // Actualizar novedad - marcar como PROCESADA
      await updateDoc(doc(db, 'novedades', novedad.id), {
        ordenTrabajoId: ordenTrabajoId,
        estado: 'PROCESADA'
      });

      console.log('[ModalDetalleNovedad] ✅ Orden de Trabajo creada:', ordenTrabajoId);
      showSuccess('Orden de Trabajo creada exitosamente');

      onUpdated();
      onClose();
    } catch (error) {
      console.error('[ModalDetalleNovedad] ❌ Error creando OT:', error);
      showError('Error al crear la orden de trabajo: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (est: string) => {
    switch (est) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-800';
      case 'RESUELTA': return 'bg-green-100 text-green-800';
      case 'RECHAZADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h2 className="text-2xl font-bold">Detalle de Novedad</h2>
                <p className="text-white/80 text-sm">ID: {novedad.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info de Unidad */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información de la Unidad
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Número:</span>
                <span className="ml-2 font-semibold text-gray-800">INT-{novedad.unidad.numero}</span>
              </div>
              <div>
                <span className="text-gray-600">Patente:</span>
                <span className="ml-2 font-semibold text-gray-800">{obtenerPatente(novedad.unidad.numero) || novedad.unidad.patente || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Descripción del Problema</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-800 leading-relaxed">{novedad.descripcion}</p>
            </div>
          </div>

          {/* Comentario Chofer (si existe) */}
          {novedad.comentarioChofer && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Comentario del Chofer</label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed">{novedad.comentarioChofer}</p>
              </div>
            </div>
          )}

          {/* Foto Individual (si existe) */}
          {novedad.fotoUrl && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Foto Adjunta
              </label>
              <div className="relative group cursor-pointer max-w-md" onClick={() => setImagenViewer(novedad.fotoUrl!)}>
                <img
                  src={novedad.fotoUrl}
                  alt="Foto adjunta"
                  className="w-full h-64 object-cover rounded-lg border-2 border-amber-200 group-hover:border-amber-400 transition-colors"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Fotos de Evidencia */}
          {novedad.fotosEvidencia && novedad.fotosEvidencia.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Fotos de Evidencia ({novedad.fotosEvidencia.length})
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {novedad.fotosEvidencia.map((fotoUrl, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => setImagenViewer(fotoUrl)}
                  >
                    <img
                      src={fotoUrl}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-32 md:h-40 object-cover rounded-lg border-2 border-amber-200 group-hover:border-amber-400 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fecha de Reporte</label>
              <div className="flex items-center gap-2 text-gray-800">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {novedad.fecha ? convertirTimestampFirebase(novedad.fecha).toLocaleDateString('es-AR') : 'N/A'}
              </div>
            </div>
            {novedad.ordenTrabajoId && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Orden de Trabajo Generada</label>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 inline-block">
                  <span className="text-purple-700 font-mono font-semibold">OT #{getNumeroOTCorto()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Gestión - Estado y Prioridad */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Gestión de la Novedad
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  style={{ fontSize: '16px' }}
                  disabled={novedad.ordenTrabajoId ? true : false}
                >
                  <option value="PENDIENTE">⏳ Pendiente</option>
                  <option value="PROCESADA">📋 Procesada (OT Generada)</option>
                  <option value="EN_PROCESO">🔧 En Proceso</option>
                  <option value="RESUELTA">✅ Resuelta</option>
                  <option value="RECHAZADA">❌ Rechazada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  style={{ fontSize: '16px' }}
                >
                  <option value="ALTA">🔴 Alta - Urgente</option>
                  <option value="MEDIA">🟡 Media - Normal</option>
                  <option value="BAJA">🟢 Baja - Puede esperar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            {/* Botón Tomar Novedad - Solo si no tiene OT asignada */}
            {!novedad.ordenTrabajoId && (
              <button
                onClick={handleTomarNovedad}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Creando OT...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    🔧 Tomar Novedad (Crear Orden de Trabajo)
                  </>
                )}
              </button>
            )}

            {novedad.ordenTrabajoId && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 text-center">
                <p className="text-purple-800 font-semibold">
                  ✅ Esta novedad ya tiene una orden de trabajo asignada
                </p>
                <p className="text-purple-600 text-sm mt-1 font-mono">OT #{getNumeroOTCorto()}</p>
                {ordenAsociada?.asignadoA && (
                  <p className="text-green-700 text-sm mt-2 font-semibold">
                    👤 Tomada por: {ordenAsociada.asignadoA}
                  </p>
                )}
                {ordenAsociada && !ordenAsociada.asignadoA && (
                  <p className="text-amber-600 text-sm mt-2">
                    ⏳ Sin asignar todavía
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={handleActualizar}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleEliminar}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar Novedad
            </button>
          </div>
        </div>

        {/* Visor de Imagen dentro del modal */}
        {imagenViewer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[100]"
            onClick={() => setImagenViewer(null)}
          >
            <div className="relative max-w-5xl max-h-[95vh] w-full h-full flex items-center justify-center p-4">
              <button
                onClick={() => setImagenViewer(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={imagenViewer}
                alt="Imagen ampliada"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MODAL DETALLE/EDICIÓN ORDEN DE TRABAJO
// ============================================================================
interface ModalDetalleOrdenProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onUpdated: () => void;
}

const ModalDetalleOrden: React.FC<ModalDetalleOrdenProps> = ({ orden, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState(orden.estado);
  const [prioridad, setPrioridad] = useState(orden.prioridad);
  const [asignadoA, setAsignadoA] = useState(orden.asignadoA || '');
  const [comentarioFin, setComentarioFin] = useState(orden.comentarioFin || '');
  const [imagenViewer, setImagenViewer] = useState<string | null>(null);

  const handleActualizar = async () => {
    setLoading(true);
    try {
      // Determinar estado automático basado en asignación
      let estadoFinal = estado;

      // Si se asigna técnico y estado es PENDIENTE, cambiar automáticamente a EN_PROCESO
      if (asignadoA && !orden.asignadoA && estado === 'PENDIENTE') {
        estadoFinal = 'EN_PROCESO';
        setEstado('EN_PROCESO');
      }

      const updateData: any = {
        estado: estadoFinal,
        prioridad,
        asignadoA: asignadoA || null,
        comentarioFin: comentarioFin || null,
      };

      if (estadoFinal === 'COMPLETADA' && !orden.timestampCompletada) {
        updateData.timestampCompletada = serverTimestamp();
      }

      if (asignadoA && !orden.fechaAsignacion) {
        updateData.fechaAsignacion = serverTimestamp();
      }

      await updateDoc(doc(db, 'ordenes_trabajo', orden.id), updateData);

      console.log('[ModalDetalleOrden] Orden actualizada exitosamente');
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleOrden] Error:', error);
      showError('Error al actualizar la orden de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta orden de trabajo? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'ordenes_trabajo', orden.id));
      console.log('[ModalDetalleOrden] Orden eliminada:', orden.id);
      showSuccess('Orden de trabajo eliminada exitosamente');
      onClose();
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleOrden] Error al eliminar:', error);
      showError('Error al eliminar la orden de trabajo: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-800';
      case 'COMPLETADA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <h2 className="text-2xl font-bold">Orden de Trabajo #{orden.numeroOT}</h2>
                <p className="text-white/80 text-sm">ID: {orden.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info de Unidad */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Información de la Orden
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Unidad:</span>
                <span className="ml-2 font-semibold text-gray-800">INT-{orden.unidad.numero}</span>
              </div>
              <div>
                <span className="text-gray-600">Patente:</span>
                <span className="ml-2 font-semibold text-gray-800">{obtenerPatente(orden.unidad.numero) || orden.unidad.patente || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Tipo:</span>
                <span className="ml-2 font-semibold text-purple-700">{orden.tipo}</span>
              </div>
            </div>
          </div>

          {/* Resumen de OT Completada - Solo si está CERRADO/COMPLETADA */}
          {(orden.estado === 'CERRADO' || orden.estado === 'COMPLETADA') && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-emerald-800 text-lg">Trabajo Completado</h3>
                  <p className="text-emerald-600 text-sm">Resumen del trabajo realizado</p>
                </div>
              </div>

              {/* Tiempo de resolución y Costo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tiempo de resolución</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {(() => {
                          try {
                            const fechaCreacion = convertirTimestampFirebase(orden.timestamp);
                            const fechaCierre = orden.timestampCompletada ? convertirTimestampFirebase(orden.timestampCompletada) : new Date();
                            const dias = Math.ceil((fechaCierre.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24));
                            return dias <= 0 ? 'Mismo día' : `${dias} ${dias === 1 ? 'día' : 'días'}`;
                          } catch {
                            return 'N/A';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Costo de reparación</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {orden.costoReparacion ? `$${orden.costoReparacion.toLocaleString('es-AR')}` : 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-emerald-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Timeline
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-500">Creada</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 ml-5">
                      {(() => {
                        try {
                          return convertirTimestampFirebase(orden.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
                        } catch {
                          return 'N/A';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-16 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gray-500">Cerrada</span>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mr-5">
                      {(() => {
                        try {
                          return orden.timestampCompletada ? convertirTimestampFirebase(orden.timestampCompletada).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                        } catch {
                          return 'N/A';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal, Tipo y Prioridad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs text-gray-500">Personal asignado</span>
                  </div>
                  <p className="font-semibold text-gray-800">{orden.asignadoA || orden.mecanico || 'No especificado'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-xs text-gray-500">Tipo de trabajo</span>
                  </div>
                  <p className="font-semibold text-gray-800">{orden.tipo}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs text-gray-500">Prioridad</span>
                  </div>
                  <p className={`font-semibold ${
                    orden.prioridad === 'ALTA' ? 'text-red-600' :
                    orden.prioridad === 'MEDIA' ? 'text-amber-600' :
                    'text-green-600'
                  }`}>{orden.prioridad}</p>
                </div>
              </div>

              {/* Trabajo realizado (si hay comentario) */}
              {orden.comentarioFin && (
                <div className="bg-white rounded-lg p-4 mt-3 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Trabajo realizado</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{orden.comentarioFin}</p>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Descripción del Trabajo</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-800 leading-relaxed">{orden.descripcion}</p>
            </div>
          </div>

          {/* Fotos de Evidencia */}
          {orden.fotosEvidencia && orden.fotosEvidencia.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Fotos de Evidencia ({orden.fotosEvidencia.length})
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {orden.fotosEvidencia.map((fotoUrl, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => setImagenViewer(fotoUrl)}
                  >
                    <img
                      src={fotoUrl}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-32 md:h-40 object-cover rounded-lg border-2 border-purple-200 group-hover:border-purple-400 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gestión - Estado, Prioridad, Asignación - Solo si NO está completada */}
          {orden.estado !== 'CERRADO' && orden.estado !== 'COMPLETADA' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Gestión de la Orden
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="PENDIENTE">⏳ Pendiente</option>
                    <option value="EN_PROCESO">🔧 En Proceso</option>
                    <option value="COMPLETADA">✅ Completada</option>
                    <option value="CANCELADA">❌ Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad</label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="ALTA">🔴 Alta - Urgente</option>
                    <option value="MEDIA">🟡 Media - Normal</option>
                    <option value="BAJA">🟢 Baja - Puede esperar</option>
                  </select>
                </div>
              </div>

              {/* Asignación */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Asignado a (Técnico/Mecánico)</label>
                <input
                  type="text"
                  value={asignadoA}
                  onChange={(e) => setAsignadoA(e.target.value)}
                  placeholder="Nombre del técnico o taller"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Comentario Final */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Comentarios / Trabajo Realizado</label>
                <textarea
                  value={comentarioFin}
                  onChange={(e) => setComentarioFin(e.target.value)}
                  rows={4}
                  placeholder="Descripción del trabajo realizado, repuestos utilizados, observaciones..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
          )}

          {/* Fechas - Solo mostrar para OTs no completadas */}
          {orden.estado !== 'CERRADO' && orden.estado !== 'COMPLETADA' && (orden.fechaAsignacion || orden.timestampCompletada) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Información de Seguimiento</h4>
              <div className="space-y-1 text-sm text-blue-800">
                {orden.fechaAsignacion && (
                  <div>
                    <span className="font-medium">Asignada:</span> {new Date(orden.fechaAsignacion).toLocaleString('es-AR')}
                  </div>
                )}
                {orden.timestampCompletada && (
                  <div>
                    <span className="font-medium">Completada:</span> {new Date(orden.timestampCompletada).toLocaleString('es-AR')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            {/* Para OTs completadas, solo mostrar botón Cerrar */}
            {(orden.estado === 'CERRADO' || orden.estado === 'COMPLETADA') ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white font-semibold rounded-lg hover:from-[#4a9428] hover:to-[#96d055] active:scale-95 transition-all"
              >
                Cerrar
              </button>
            ) : (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleActualizar}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleEliminar}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Orden de Trabajo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Visor de Imagen dentro del modal */}
        {imagenViewer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[100]"
            onClick={() => setImagenViewer(null)}
          >
            <div className="relative max-w-5xl max-h-[95vh] w-full h-full flex items-center justify-center p-4">
              <button
                onClick={() => setImagenViewer(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={imagenViewer}
                alt="Imagen ampliada"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// UTILIDADES
// ============================================================================
const formatearFecha = (fecha: any): string => {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  try {
    const dateObj = convertirTimestampFirebase(fecha);
    if (isNaN(dateObj.getTime())) {
      console.error('[formatearFecha] ❌ Fecha inválida:', {
        tipoRecibido: typeof fecha,
        valorRecibido: fecha,
        esDate: fecha instanceof Date
      });
      return 'Fecha no disponible';
    }

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatearFecha] ❌ Error formateando fecha:', error, 'Valor:', fecha);
    return 'Fecha no disponible';
  }
};

// ============================================================================
// MODAL DETALLE CHECKLIST COMPLETO
// ============================================================================
interface ModalDetalleChecklistProps {
  checklist: ChecklistRegistro;
  onClose: () => void;
  onUpdated: () => void;
}

const ModalDetalleChecklist: React.FC<ModalDetalleChecklistProps> = ({ checklist, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este checklist? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'checklists', checklist.id));
      console.log('[ModalDetalleChecklist] Checklist eliminado:', checklist.id);
      showSuccess('Checklist eliminado exitosamente');
      onClose();
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleChecklist] Error al eliminar:', error);
      showError('Error al eliminar el checklist: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_APLICA': return 'bg-white border-gray-300 text-gray-500';
      default: return 'bg-white border-gray-300 text-gray-700';
    }
  };

  const getEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return '✓';
      case 'NO_CONFORME': return '✗';
      case 'NO_APLICA': return '−';
      default: return '•';
    }
  };

  const getResultadoColor = (resultado: string) => {
    switch (resultado) {
      case 'APTO': return 'bg-[#56ab2f]';
      case 'NO_APTO': return 'bg-red-500';
      case 'PENDIENTE': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl md:rounded-2xl max-w-5xl w-full my-4 md:my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Detalle de Checklist</h2>
                <p className="text-white/90 text-xs md:text-sm">Unidad {checklist.unidad.numero} - {formatearFecha(checklist.fecha)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 md:p-2 hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Unidad */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información de la Unidad</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Unidad:</span>
                  <span className="font-semibold text-gray-900">INT-{checklist.unidad.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patente:</span>
                  <span className="font-semibold text-gray-900">{(checklist.unidad.patente && checklist.unidad.patente !== 'N/A') ? checklist.unidad.patente : obtenerPatente(checklist.unidad.numero)}</span>
                </div>
                {checklist.cisterna && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pat. Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.patente}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Sector:</span>
                  <span className="font-semibold text-gray-900 uppercase">{checklist.sector}</span>
                </div>
              </div>
            </div>

            {/* Chofer y Fecha */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información del Checklist</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chofer:</span>
                  <span className="font-semibold text-gray-900">{checklist.chofer.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-semibold text-gray-900">
                    {formatearFecha(checklist.fecha)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Odómetro:</span>
                  <span className="font-semibold text-gray-900">
                    {checklist.odometroInicial.valor.toLocaleString()} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className={`${getResultadoColor(checklist.resultado)} rounded-lg p-3 md:p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Resultado: {checklist.resultado}</h3>
                <p className="text-white/95 text-xs md:text-sm mt-0.5">
                  {checklist.itemsConformes} conformes • {checklist.itemsRechazados} rechazados
                </p>
              </div>
              <div className="text-2xl md:text-3xl">
                {checklist.resultado === 'APTO' ? '✓' : checklist.resultado === 'NO_APTO' ? '✗' : '−'}
              </div>
            </div>
          </div>

          {/* Ítems del Checklist */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 uppercase tracking-wide">
              Ítems Inspeccionados ({checklist.items.length})
            </h3>

            <div className="space-y-2">
              {checklist.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.estado === 'NO_CONFORME' && item.esCritico
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Número */}
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-semibold text-xs border border-gray-300">
                      {item.numero}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-gray-900 flex-1">{item.descripcion}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${getEstadoColor(item.estado)}`}>
                          {getEstadoIcono(item.estado)} {item.estado.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Badges de info */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                          {item.categoria.replace('_', ' ')}
                        </span>
                        {item.esCritico && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-semibold">
                            CRÍTICO
                          </span>
                        )}
                      </div>

                      {/* Comentario si existe */}
                      {item.comentario && (
                        <div className="mt-2 p-3 bg-gray-50 border-l-2 border-gray-300 rounded text-sm text-gray-700">
                          {item.comentario}
                        </div>
                      )}

                      {/* Foto si existe */}
                      {item.fotoUrl && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">📎 Evidencia fotográfica adjunta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleEliminar}
              disabled={loading}
              className="px-6 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-red-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL COMPLETAR ORDEN DE TRABAJO
// ============================================================================
interface ModalCompletarOrdenProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onCompletado: () => void;
}

const ModalCompletarOrden: React.FC<ModalCompletarOrdenProps> = ({ orden, onClose, onCompletado }) => {
  const [loading, setLoading] = useState(false);
  const [mecanico, setMecanico] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [comentarioFin, setComentarioFin] = useState('');
  const [costoManoObra, setCostoManoObra] = useState(0);

  // Estado para repuestos
  const [repuestos, setRepuestos] = useState<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    precioTotal: number;
  }[]>([]);

  // Agregar repuesto
  const agregarRepuesto = () => {
    setRepuestos([...repuestos, { nombre: '', cantidad: 1, precioUnitario: 0, precioTotal: 0 }]);
  };

  // Eliminar repuesto
  const eliminarRepuesto = (index: number) => {
    setRepuestos(repuestos.filter((_, i) => i !== index));
  };

  // Actualizar repuesto
  const actualizarRepuesto = (index: number, campo: string, valor: any) => {
    const nuevosRepuestos = [...repuestos];
    nuevosRepuestos[index] = {
      ...nuevosRepuestos[index],
      [campo]: valor
    };

    // Calcular precio total automáticamente
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      nuevosRepuestos[index].precioTotal =
        nuevosRepuestos[index].cantidad * nuevosRepuestos[index].precioUnitario;
    }

    setRepuestos(nuevosRepuestos);
  };

  // Calcular costos totales
  const costoRepuestos = repuestos.reduce((sum, r) => sum + r.precioTotal, 0);
  const costoTotal = costoRepuestos + costoManoObra;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      const updateData: any = {
        estado: 'CERRADO',
        mecanico: mecanico || null,
        fechaInicio: fechaInicio ? Timestamp.fromDate(new Date(fechaInicio)) : null,
        fechaFin: fechaFin ? Timestamp.fromDate(new Date(fechaFin)) : null,
        comentarioFin: comentarioFin || null,
        repuestos: repuestos.length > 0 ? repuestos : null,
        costoManoObra: costoManoObra || 0,
        costoRepuestos: costoRepuestos || 0,
        costoReparacion: costoTotal || 0,
        timestampCompletada: Timestamp.now()
      };

      await updateDoc(ordenRef, updateData);

      console.log('[ModalCompletarOrden] ✅ Orden completada exitosamente:', orden.id);
      showSuccess('Orden de Trabajo completada exitosamente');

      onCompletado();
      onClose();
    } catch (error) {
      console.error('[ModalCompletarOrden] ❌ Error completando orden:', error);
      showError('Error al completar la orden. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Completar Orden de Trabajo</h2>
                <p className="text-emerald-100 mt-1">
                  OT #{orden.id.slice(-6).toUpperCase()} - Unidad {orden.unidad.numero}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mecánico Asignado *
                </label>
                <input
                  type="text"
                  value={mecanico}
                  onChange={(e) => setMecanico(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Nombre del mecánico"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Costo Mano de Obra ($)
                </label>
                <input
                  type="number"
                  value={costoManoObra}
                  onChange={(e) => setCostoManoObra(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha/Hora Inicio
                </label>
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha/Hora Fin
                </label>
                <input
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Desglose de Repuestos */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Desglose de Repuestos</h3>
                <button
                  type="button"
                  onClick={agregarRepuesto}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-semibold"
                >
                  + Agregar Repuesto
                </button>
              </div>

              {repuestos.length > 0 ? (
                <div className="space-y-3">
                  {repuestos.map((repuesto, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-lg">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={repuesto.nombre}
                          onChange={(e) => actualizarRepuesto(index, 'nombre', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                          placeholder="Nombre del repuesto"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={repuesto.cantidad}
                          onChange={(e) => actualizarRepuesto(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                          placeholder="Cant."
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={repuesto.precioUnitario}
                          onChange={(e) => actualizarRepuesto(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                          placeholder="P. Unit."
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-semibold text-emerald-700">
                          ${repuesto.precioTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => eliminarRepuesto(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No se agregaron repuestos</p>
              )}
            </div>

            {/* Resumen de Costos */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
              <h3 className="text-lg font-bold text-emerald-800 mb-3">Resumen de Costos</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Repuestos:</span>
                  <span className="font-semibold">
                    ${costoRepuestos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Mano de Obra:</span>
                  <span className="font-semibold">
                    ${costoManoObra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t-2 border-emerald-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-emerald-800 font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>${costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Comentario Final */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Comentario Final
              </label>
              <textarea
                value={comentarioFin}
                onChange={(e) => setComentarioFin(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Describe el trabajo realizado y cualquier observación..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Completando...' : '✅ Completar Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES PARA COMBUSTIBLE
// ============================================================================

/**
 * Componente para mostrar el consumo calculado de una unidad
 */
function DetalleConsumoUnidad({ unidadNumero }: { unidadNumero: string }) {
  const [consumo, setConsumo] = useState<ConsumoCombustible | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarConsumo = async () => {
      try {
        setLoading(true);
        const consumoData = await getConsumoUnidad(unidadNumero);
        setConsumo(consumoData);
      } catch (error) {
        console.error('[DetalleConsumoUnidad] Error cargando consumo:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarConsumo();
  }, [unidadNumero]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0033A0]"></div>
        </div>
      </div>
    );
  }

  if (!consumo) {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200 mb-6">
        <div className="flex items-center gap-2 text-yellow-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">Sin consumo calculado</span>
        </div>
        <p className="text-sm text-yellow-600 mt-2">
          Se necesitan al menos 2 cargas en el mes para calcular el consumo promedio (L/100km).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200 mb-6">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Consumo Calculado - {consumo.mes}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <p className="text-xs text-gray-600">Consumo Promedio</p>
          <p className="text-2xl font-bold text-green-700">{consumo.consumoPromedio.toFixed(2)} <span className="text-sm">L/100km</span></p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-gray-600">Total Km Recorridos</p>
          <p className="text-2xl font-bold text-blue-700">{consumo.totalKilometros.toLocaleString('es-AR')} km</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600">Costo por Km</p>
          <p className="text-2xl font-bold text-gray-700">${consumo.costoPorKm.toFixed(2)}/km</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Tendencia vs mes anterior:</span>
          <span className={`font-bold ${consumo.tendencia > 0 ? 'text-red-600' : consumo.tendencia < 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {consumo.tendencia > 0 ? '↑' : consumo.tendencia < 0 ? '↓' : '='} {Math.abs(consumo.tendencia).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600">vs Promedio flota:</span>
          <span className={`font-bold ${consumo.desviacionPromedio > 0 ? 'text-red-600' : consumo.desviacionPromedio < 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {consumo.desviacionPromedio > 0 ? '↑' : consumo.desviacionPromedio < 0 ? '↓' : '='} {Math.abs(consumo.desviacionPromedio).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente para mostrar alertas de consumo de una unidad
 */
function AlertasUnidad({ unidadNumero }: { unidadNumero: string }) {
  const [alertas, setAlertas] = useState<AlertaCombustible[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        setLoading(true);
        const alertasData = await getAlertasByUnidad(unidadNumero);
        setAlertas(alertasData);
      } catch (error) {
        console.error('[AlertasUnidad] Error cargando alertas:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarAlertas();
  }, [unidadNumero]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mb-6">
        <div className="flex items-center gap-2 text-green-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">✅ Sin alertas - Consumo normal</span>
        </div>
        <p className="text-sm text-green-600 mt-2">
          El consumo de esta unidad está dentro del rango esperado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-amber-300 p-4 mb-6">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Alertas de Consumo ({alertas.length})
      </h3>
      <div className="space-y-3">
        {alertas.map((alerta) => (
          <div
            key={alerta.id}
            className={`rounded-lg p-3 border-2 ${
              alerta.severidad === 'ALTA' ? 'bg-red-50 border-red-300' :
              alerta.severidad === 'MEDIA' ? 'bg-amber-50 border-amber-300' :
              'bg-blue-50 border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${
                  alerta.tipo === 'CONSUMO_ALTO' ? '⚠️' :
                  alerta.tipo === 'MEJORA_SIGNIFICATIVA' ? '✅' :
                  '📊'
                }`}></span>
                <div>
                  <div className={`font-semibold ${
                    alerta.severidad === 'ALTA' ? 'text-red-700' :
                    alerta.severidad === 'MEDIA' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {alerta.tipo === 'CONSUMO_ALTO' ? 'Consumo Alto' :
                     alerta.tipo === 'MEJORA_SIGNIFICATIVA' ? 'Mejora Significativa' :
                     alerta.tipo}
                  </div>
                  <div className="text-xs text-gray-600">
                    {convertirTimestampFirebase(alerta.fechaDeteccion).toLocaleDateString('es-AR')} - {alerta.estado}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                alerta.severidad === 'ALTA' ? 'bg-red-200 text-red-800' :
                alerta.severidad === 'MEDIA' ? 'bg-amber-200 text-amber-800' :
                'bg-blue-200 text-blue-800'
              }`}>
                {alerta.severidad}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{alerta.mensaje}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-gray-600">Consumo Actual</p>
                <p className="font-bold text-gray-800">{alerta.consumoActual.toFixed(2)} L/100km</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-gray-600">Consumo Esperado</p>
                <p className="font-bold text-gray-800">{alerta.consumoEsperado.toFixed(2)} L/100km</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-gray-600">Diferencia</p>
                <p className={`font-bold ${
                  alerta.diferenciaPorcentual > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {alerta.diferenciaPorcentual > 0 ? '+' : ''}{alerta.diferenciaPorcentual.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const DashboardMantenimiento: React.FC<DashboardMantenimientoProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('kanban');
  const [loading, setLoading] = useState(false);
  const [checklists, setChecklists] = useState<ChecklistRegistro[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [cargas, setCargas] = useState<CargaCombustible[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalChecklists: 0,
    checklistsApto: 0,
    checklistsNoApto: 0,
    novedadesPendientes: 0,
    ordenesAbiertas: 0,
    ordenesEnProceso: 0
  });

  const [filtros, setFiltros] = useState<Filtros>({
    sector: '',
    unidad: '',
    fechaDesde: '',
    fechaHasta: '',
    resultado: '',
    prioridad: '',
    estado: ''
  });

  // Estado separado para el input de búsqueda de unidad (sugerencias sin filtrar)
  const [unidadBusqueda, setUnidadBusqueda] = useState('');

  const [selectedItem, setSelectedItem] = useState<ChecklistRegistro | Novedad | OrdenTrabajo | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Estados para modales de creación
  const [showCrearNovedad, setShowCrearNovedad] = useState(false);
  const [showCrearOrden, setShowCrearOrden] = useState(false);

  // Estados para modales de edición/detalle
  const [showDetalleNovedad, setShowDetalleNovedad] = useState(false);
  const [novedadSeleccionada, setNovedadSeleccionada] = useState<Novedad | null>(null);
  const [showDetalleOrden, setShowDetalleOrden] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [showDetalleChecklist, setShowDetalleChecklist] = useState(false);
  const [checklistSeleccionado, setChecklistSeleccionado] = useState<ChecklistRegistro | null>(null);

  // Estado para modal completar OT
  const [showCompletarOrden, setShowCompletarOrden] = useState(false);
  const [ordenACompletar, setOrdenACompletar] = useState<OrdenTrabajo | null>(null);

  // Estado para modal de detalles de combustible
  const [showDetalleCombustible, setShowDetalleCombustible] = useState(false);
  const [unidadCombustibleSeleccionada, setUnidadCombustibleSeleccionada] = useState<string | null>(null);

  // Cargar datos al montar - cargar todo para las estadísticas
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Recargar al cambiar filtros o tab
  useEffect(() => {
    cargarDatos();
  }, [filtros, activeTab]);

  // 🔥 REAL-TIME LISTENER para Órdenes de Trabajo (Kanban y Tab Órdenes)
  useEffect(() => {
    // Solo activar el listener cuando estamos en el tab de órdenes o kanban
    if (activeTab !== 'ordenes' && activeTab !== 'kanban') {
      return;
    }

    console.log('[DashboardMantenimiento] 🔥 Configurando listener en tiempo real para órdenes...');

    const ordenesRef = collection(db, 'ordenes_trabajo');
    let q;

    // Query simplificada SIN orderBy para evitar necesidad de índices compuestos
    if (filtros.estado) {
      q = query(ordenesRef, where('estado', '==', filtros.estado), limit(50));
    } else if (filtros.prioridad) {
      q = query(ordenesRef, where('prioridad', '==', filtros.prioridad), limit(50));
    } else {
      q = query(ordenesRef, limit(50));
    }

    // Configurar listener en tiempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[DashboardMantenimiento] ✨ Órdenes actualizadas en tiempo real:', snapshot.docs.length);

        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            timestamp: docData.timestamp
              ? (docData.timestamp instanceof Timestamp ? docData.timestamp.toDate() : new Date(docData.timestamp))
              : new Date(),
            fechaCreacion: docData.fechaCreacion instanceof Timestamp ? docData.fechaCreacion.toDate() : new Date(docData.fechaCreacion)
          } as OrdenTrabajo;
        });

        // Ordenar en el cliente por timestamp descendente
        data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setOrdenes(data);
        setLoading(false);
      },
      (error) => {
        console.error('[DashboardMantenimiento] ❌ Error en listener de órdenes:', error);
        setLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando cambie el tab o se desmonte el componente
    return () => {
      console.log('[DashboardMantenimiento] 🔌 Desconectando listener de órdenes');
      unsubscribe();
    };
  }, [activeTab, filtros.estado, filtros.prioridad]);

  // 🔥 REAL-TIME LISTENER para Checklists
  useEffect(() => {
    // Solo activar el listener cuando estamos en el tab de checklists
    if (activeTab !== 'checklists') {
      return;
    }

    console.log('[DashboardMantenimiento] 🔥 Configurando listener en tiempo real para checklists...');

    const checklistsRef = collection(db, 'checklists');
    let q;

    // Query simplificada SIN orderBy para evitar necesidad de índices compuestos
    if (filtros.sector) {
      q = query(checklistsRef, where('sector', '==', filtros.sector), limit(50));
    } else if (filtros.resultado) {
      q = query(checklistsRef, where('resultado', '==', filtros.resultado), limit(50));
    } else {
      q = query(checklistsRef, limit(50));
    }

    // Configurar listener en tiempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[DashboardMantenimiento] ✨ Checklists actualizados en tiempo real:', snapshot.docs.length);

        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            fecha: convertirTimestampFirebase(docData.fecha),
            timestamp: convertirTimestampFirebase(docData.timestamp),
            timestampCompletado: docData.timestampCompletado
              ? convertirTimestampFirebase(docData.timestampCompletado)
              : null,
            odometroInicial: docData.odometroInicial ? {
              ...docData.odometroInicial,
              fecha_hora: convertirTimestampFirebase(docData.odometroInicial.fecha_hora)
            } : { valor: 0, fecha_hora: new Date() },
            odometroFinal: docData.odometroFinal
              ? {
                  ...docData.odometroFinal,
                  fecha_hora: convertirTimestampFirebase(docData.odometroFinal.fecha_hora)
                }
              : null,
            items: (docData.items || []).map((item: any) => ({
              ...item,
              timestamp: item.timestamp ? convertirTimestampFirebase(item.timestamp) : null
            }))
          } as ChecklistRegistro;
        });

        // Ordenar en el cliente por timestamp descendente
        data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setChecklists(data);
        setLoading(false);
      },
      (error) => {
        console.error('[DashboardMantenimiento] ❌ Error en listener de checklists:', error);
        setLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando cambie el tab o se desmonte el componente
    return () => {
      console.log('[DashboardMantenimiento] 🔌 Desconectando listener de checklists');
      unsubscribe();
    };
  }, [activeTab, filtros.sector, filtros.resultado]);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      // Cargar TODAS las colecciones para estadísticas completas
      await Promise.all([
        cargarChecklists(),
        cargarNovedades(),
        cargarOrdenes()
      ]);
      await calcularEstadisticas();
    } catch (error) {
      console.error('[DashboardMantenimiento] Error cargando datos iniciales:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (activeTab === 'checklists') {
        await cargarChecklists();
      } else if (activeTab === 'novedades') {
        await cargarNovedades();
      } else if (activeTab === 'combustible') {
        await cargarCombustible();
      }
      // NOTA: No llamamos cargarOrdenes() aquí porque el listener en tiempo real
      // (useEffect arriba) se encarga de mantener las órdenes actualizadas automáticamente
      // cuando activeTab es 'ordenes' o 'kanban'

      await calcularEstadisticas();
    } catch (error) {
      console.error('[DashboardMantenimiento] Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarChecklists = async () => {
    const checklistsRef = collection(db, 'checklists');
    let q = query(checklistsRef, orderBy('timestamp', 'desc'), limit(50));

    // Aplicar filtros
    if (filtros.sector) {
      q = query(checklistsRef, where('sector', '==', filtros.sector), orderBy('timestamp', 'desc'), limit(50));
    }
    if (filtros.resultado) {
      q = query(checklistsRef, where('resultado', '==', filtros.resultado), orderBy('timestamp', 'desc'), limit(50));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();

      // Helper to safely convert Timestamp or Date
      const safeDate = (value: any): Date => convertirTimestampFirebase(value);

      return {
        id: doc.id,
        sector: docData.sector,
        unidad: docData.unidad,
        chofer: docData.chofer,
        resultado: docData.resultado,
        itemsRechazados: docData.itemsRechazados || 0,
        itemsConformes: docData.itemsConformes || 0,
        completado: docData.completado,
        cisterna: docData.cisterna,
        firmaChofer: docData.firmaChofer,
        geolocalizacion: docData.geolocalizacion,
        hdr: docData.hdr,
        fecha: safeDate(docData.fecha || docData.timestamp),
        timestamp: safeDate(docData.timestamp),
        timestampCompletado: safeDate(docData.timestampCompletado),
        odometroInicial: {
          valor: docData.odometroInicial?.valor || 0,
          fecha_hora: safeDate(docData.odometroInicial?.fecha_hora),
          geolocalizacion: docData.odometroInicial?.geolocalizacion
        },
        odometroFinal: docData.odometroFinal ? {
          valor: docData.odometroFinal.valor,
          fecha_hora: safeDate(docData.odometroFinal.fecha_hora),
          geolocalizacion: docData.odometroFinal.geolocalizacion
        } : undefined,
        items: (docData.items || []).map((item: any) => ({
          ...item,
          timestamp: safeDate(item.timestamp)
        }))
      } as ChecklistRegistro;
    });

    // Ordenar por timestamp descendente (más reciente primero)
    data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setChecklists(data);
  };

  const cargarNovedades = async () => {
    // Cargar novedades desde la colección 'novedades'
    const novedadesRef = collection(db, 'novedades');
    let q = query(novedadesRef, orderBy('timestamp', 'desc'), limit(50));

    // Aplicar filtros
    if (filtros.prioridad) {
      q = query(novedadesRef, where('prioridad', '==', filtros.prioridad), orderBy('timestamp', 'desc'), limit(50));
    }
    if (filtros.estado) {
      q = query(novedadesRef, where('estado', '==', filtros.estado), orderBy('timestamp', 'desc'), limit(50));
    }

    const snapshot = await getDocs(q);

    const todasNovedades: Novedad[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        checklistId: data.checklistId || '',
        itemId: data.itemId || '',
        fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : new Date(data.fecha),
        unidad: {
          numero: data.unidad?.numero || '',
          patente: data.unidad?.patente || ''
        },
        descripcion: data.descripcion || '',
        comentarioChofer: data.comentarioChofer || '',
        fotoUrl: data.fotoUrl,
        fotosEvidencia: data.fotosEvidencia || [],
        prioridad: data.prioridad || 'MEDIA',
        estado: data.estado || 'PENDIENTE',
        ordenTrabajoId: data.ordenTrabajoId,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
        timestampResuelta: data.timestampResuelta instanceof Timestamp ? data.timestampResuelta.toDate() : undefined
      } as Novedad;
    });

    setNovedades(todasNovedades);
  };

  const cargarCombustible = async () => {
    try {
      const cargasData = await getAllCargasCombustible(100);
      setCargas(cargasData);
      console.log('[DashboardMantenimiento] ⛽ Cargas de combustible cargadas:', cargasData.length);
    } catch (error) {
      console.error('[DashboardMantenimiento] Error cargando cargas de combustible:', error);
    }
  };

  const handleDeleteCarga = async (cargaId: string, numeroUnidad: string) => {
    // Confirmar con el usuario
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar esta carga de combustible?\n\nUnidad: INT-${numeroUnidad}\nID: ${cargaId}\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return; // Usuario canceló
    }

    try {
      console.log('[DashboardMantenimiento] 🗑️ Eliminando carga:', cargaId);

      // Eliminar de Firebase
      await deleteCargaCombustible(cargaId);

      // Actualizar estado local (recargar lista)
      await cargarCombustible();

      console.log('[DashboardMantenimiento] ✅ Carga eliminada exitosamente');
      showSuccess('Carga de combustible eliminada exitosamente');
    } catch (error) {
      console.error('[DashboardMantenimiento] ❌ Error eliminando carga:', error);
      showError('Error al eliminar la carga. Por favor, intenta de nuevo.');
    }
  };

  const cargarOrdenes = async () => {
    const ordenesRef = collection(db, 'ordenes_trabajo');
    let q = query(ordenesRef, orderBy('timestamp', 'desc'), limit(50));

    // Aplicar filtros
    if (filtros.estado) {
      q = query(ordenesRef, where('estado', '==', filtros.estado), orderBy('timestamp', 'desc'), limit(50));
    }
    if (filtros.prioridad) {
      q = query(ordenesRef, where('prioridad', '==', filtros.prioridad), orderBy('timestamp', 'desc'), limit(50));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        timestamp: docData.timestamp
              ? (docData.timestamp instanceof Timestamp ? docData.timestamp.toDate() : new Date(docData.timestamp))
              : new Date(),
        fechaCreacion: docData.fechaCreacion instanceof Timestamp ? docData.fechaCreacion.toDate() : new Date(docData.fechaCreacion)
      } as OrdenTrabajo;
    });

    setOrdenes(data);
  };

  const calcularEstadisticas = async () => {
    // Calcular estadísticas agregadas
    const checklistsRef = collection(db, 'checklists');
    const ordenesRef = collection(db, 'ordenes_trabajo');

    const [checklistsSnapshot, ordenesSnapshot] = await Promise.all([
      getDocs(query(checklistsRef, limit(100))),
      getDocs(query(ordenesRef, limit(100)))
    ]);

    const totalChecklists = checklistsSnapshot.size;
    const checklistsApto = checklistsSnapshot.docs.filter(doc => doc.data().resultado === 'APTO').length;
    const checklistsNoApto = checklistsSnapshot.docs.filter(doc => doc.data().resultado === 'NO_APTO').length;

    const ordenesAbiertas = ordenesSnapshot.docs.filter(doc => doc.data().estado === 'PENDIENTE').length;
    const ordenesEnProceso = ordenesSnapshot.docs.filter(doc => doc.data().estado === 'EN_PROCESO').length;

    // Contar novedades (dentro de checklists)
    let novedadesPendientes = 0;
    checklistsSnapshot.docs.forEach(doc => {
      const novedades = doc.data().novedades || [];
      novedadesPendientes += novedades.length;
    });

    setEstadisticas({
      totalChecklists,
      checklistsApto,
      checklistsNoApto,
      novedadesPendientes,
      ordenesAbiertas,
      ordenesEnProceso
    });
  };

  const limpiarFiltros = () => {
    setFiltros({
      sector: '',
      unidad: '',
      fechaDesde: '',
      fechaHasta: '',
      resultado: '',
      prioridad: '',
      estado: ''
    });
  };

  // Función para manejar cambios de estado desde el Kanban
  const handleEstadoChange = async (ordenId: string, nuevoEstado: OrdenTrabajo['estado']) => {
    // Si intentan cerrar la orden, mostrar modal de completar con desglose
    if (nuevoEstado === 'CERRADO') {
      const orden = ordenes.find(o => o.id === ordenId);
      if (orden) {
        setOrdenACompletar(orden);
        setShowCompletarOrden(true);
      }
      return;
    }

    // Para otros estados, actualizar directamente
    try {
      const ordenRef = doc(db, 'ordenes_trabajo', ordenId);
      const updateData: any = {
        estado: nuevoEstado
      };

      await updateDoc(ordenRef, updateData);
      console.log('[DashboardMantenimiento] ✅ Estado actualizado:', ordenId, '→', nuevoEstado);
      console.log('[DashboardMantenimiento] 🔥 El listener en tiempo real actualizará la UI automáticamente');
    } catch (error) {
      console.error('[DashboardMantenimiento] ❌ Error actualizando estado:', error);
      showError('Error al actualizar el estado de la orden. Por favor intenta de nuevo.');
    }
  };

  const eliminarNovedad = async (novedadId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta novedad? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'novedades', novedadId));
      console.log('[DashboardMantenimiento] Novedad eliminada:', novedadId);
      showSuccess('Novedad eliminada exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('[DashboardMantenimiento] Error al eliminar novedad:', error);
      showError('Error al eliminar la novedad: ' + (error as Error).message);
    }
  };

  const eliminarOrden = async (ordenId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta orden de trabajo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('[DashboardMantenimiento] 🗑️ Intentando eliminar orden:', ordenId);
      await deleteDoc(doc(db, 'ordenes_trabajo', ordenId));
      console.log('[DashboardMantenimiento] ✅ Orden eliminada exitosamente:', ordenId);
      showSuccess('Orden de trabajo eliminada exitosamente');
      // No necesitamos cargarDatos() - el listener en tiempo real se encarga de actualizar
    } catch (error) {
      console.error('[DashboardMantenimiento] ❌ Error al eliminar orden:', error);
      showError('Error al eliminar la orden de trabajo: ' + (error as Error).message);
    }
  };

  const eliminarChecklist = async (checklistId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este checklist? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('[DashboardMantenimiento] 🗑️ Intentando eliminar checklist:', checklistId);
      await deleteDoc(doc(db, 'checklists', checklistId));
      console.log('[DashboardMantenimiento] ✅ Checklist eliminado exitosamente:', checklistId);
      showSuccess('Checklist eliminado exitosamente');
      // No necesitamos cargarDatos() - el listener en tiempo real se encarga de actualizar
    } catch (error) {
      console.error('[DashboardMantenimiento] ❌ Error al eliminar checklist:', error);
      showError('Error al eliminar el checklist: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Tabs con branding Crosslog y responsive */}
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        <div className="bg-white rounded-t-2xl shadow-lg">
          {/* Tabs compactos para móvil - Badge al lado del icono */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('checklists')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'checklists'
                  ? 'text-[#56ab2f] border-b-3 border-[#56ab2f] bg-[#f0f9e8]'
                  : 'text-gray-500 hover:text-[#56ab2f] hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'checklists' ? 'bg-[#56ab2f] text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{checklists.length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">Check</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('novedades')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'novedades'
                  ? 'text-amber-600 border-b-3 border-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'novedades' ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{novedades.length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">Nov</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('ordenes')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'ordenes'
                  ? 'text-purple-600 border-b-3 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'ordenes' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{ordenes.length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">OTs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'kanban'
                  ? 'text-indigo-600 border-b-3 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{ordenes.length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">Board</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'historial'
                  ? 'text-emerald-600 border-b-3 border-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'historial' ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{ordenes.filter(o => o.estado === 'CERRADO').length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">Hist</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('combustible')}
              className={`flex-1 px-1.5 sm:px-3 md:px-4 py-2.5 md:py-3 font-semibold transition-colors text-xs sm:text-sm ${
                activeTab === 'combustible'
                  ? 'text-[#0033A0] border-b-3 border-[#0033A0] bg-blue-50'
                  : 'text-gray-500 hover:text-[#0033A0] hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-base">⛽</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'combustible' ? 'bg-[#0033A0] text-white' : 'bg-gray-300 text-gray-700'
                  }`}>{cargas.length}</span>
                </div>
                <span className="hidden sm:inline text-[11px] sm:text-xs">Comb</span>
              </div>
            </button>
          </div>

          {/* Contenido de tabs - Responsive Android */}
          <div className="p-3 md:p-6 min-h-[500px] md:min-h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#56ab2f]"></div>
              </div>
            ) : (
              <div>
                {/* Tab Checklists */}
                {activeTab === 'checklists' && (
                  <div>
                    {/* Filtros optimizados para móvil */}
                    <div className="bg-gradient-to-br from-[#f0f9e8] to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-[#a8e063]/20">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Sector</label>
                          <select
                            value={filtros.sector}
                            onChange={(e) => setFiltros({ ...filtros, sector: e.target.value as any })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Todos los sectores</option>
                            <option value="vrac">VRAC Cisternas</option>
                            <option value="vital-aire">Vital Aire</option>
                            <option value="distribucion">Distribución</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Resultado</label>
                          <select
                            value={filtros.resultado}
                            onChange={(e) => setFiltros({ ...filtros, resultado: e.target.value as any })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Todos</option>
                            <option value="APTO">✅ APTO</option>
                            <option value="NO_APTO">❌ NO APTO</option>
                            <option value="PENDIENTE">⚠️ PENDIENTE</option>
                          </select>
                        </div>

                        <div className="relative">
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Unidad</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={unidadBusqueda}
                              onChange={(e) => setUnidadBusqueda(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setFiltros({ ...filtros, unidad: unidadBusqueda });
                                  setUnidadBusqueda('');
                                }
                              }}
                              placeholder={filtros.unidad ? `Filtrado: INT-${filtros.unidad}` : "Buscar INT..."}
                              className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white touch-target-48"
                              style={{ fontSize: '16px' }}
                            />
                            {filtros.unidad && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFiltros({ ...filtros, unidad: '' });
                                  setUnidadBusqueda('');
                                }}
                                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                                title="Quitar filtro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {/* Dropdown de sugerencias - solo mientras escribe */}
                          {unidadBusqueda && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#56ab2f] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {TODAS_LAS_UNIDADES
                                .filter(u => u.numero.includes(unidadBusqueda) || u.patente.toLowerCase().includes(unidadBusqueda.toLowerCase()))
                                .slice(0, 8)
                                .map(u => (
                                  <button
                                    key={u.numero}
                                    type="button"
                                    onClick={() => {
                                      setFiltros({ ...filtros, unidad: u.numero });
                                      setUnidadBusqueda('');
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-[#f0f9e8] transition-colors flex justify-between items-center"
                                  >
                                    <span className="font-semibold text-gray-800">INT-{u.numero}</span>
                                    <span className="text-sm text-gray-500">{u.patente}</span>
                                  </button>
                                ))}
                              {TODAS_LAS_UNIDADES.filter(u => u.numero.includes(unidadBusqueda) || u.patente.toLowerCase().includes(unidadBusqueda.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron unidades</div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              limpiarFiltros();
                              setUnidadBusqueda('');
                            }}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-lg hover:from-gray-300 hover:to-gray-400 active:scale-95 transition-all shadow-sm touch-target-48 text-sm md:text-base"
                          >
                            🔄 Limpiar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Checklists - Optimizada móvil */}
                    <div className="space-y-3 md:space-y-4">
                      {(() => {
                        // Aplicar filtros a checklists
                        const checklistsFiltrados = checklists.filter(checklist => {
                          // Filtro por sector
                          if (filtros.sector && checklist.sector !== filtros.sector) return false;
                          // Filtro por resultado
                          if (filtros.resultado && checklist.resultado !== filtros.resultado) return false;
                          // Filtro por unidad
                          if (filtros.unidad && !checklist.unidad.numero.includes(filtros.unidad)) return false;
                          return true;
                        });

                        return checklistsFiltrados.length === 0 ? (
                        <div className="text-center py-12 md:py-16">
                          <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-500 text-base md:text-lg font-medium">No hay checklists para mostrar</p>
                          <p className="text-gray-400 text-sm mt-2">Intenta ajustar los filtros o completa un nuevo checklist</p>
                        </div>
                      ) : (
                        checklistsFiltrados.map((checklist) => (
                          <div
                            key={checklist.id}
                            className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-lg hover:border-[#a8e063] transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setChecklistSeleccionado(checklist);
                                  setShowDetalleChecklist(true);
                                }}
                              >
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <h3 className="text-base md:text-lg font-bold text-gray-800 truncate">
                                    INT-{checklist.unidad.numero}
                                  </h3>
                                  <span className="text-sm text-gray-600 font-mono">{(checklist.unidad.patente && checklist.unidad.patente !== 'N/A') ? checklist.unidad.patente : obtenerPatente(checklist.unidad.numero)}</span>
                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                                    checklist.sector === 'vrac'
                                      ? 'bg-blue-100 text-blue-700'
                                      : checklist.sector === 'distribucion'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {checklist.sector === 'vrac' ? 'VRAC' : checklist.sector === 'distribucion' ? 'DISTRIBUCIÓN' : 'V.AIRE'}
                                  </span>
                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
                                    checklist.resultado === 'APTO'
                                      ? 'bg-green-100 text-green-700'
                                      : checklist.resultado === 'NO_APTO'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {checklist.resultado === 'APTO' ? '✅ APTO' : checklist.resultado === 'NO_APTO' ? '❌ NO APTO' : '⚠️ PEND'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="truncate">{checklist.chofer.nombre}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{formatearFecha(checklist.fecha)}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium text-green-700">{checklist.itemsConformes} OK</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="font-medium text-red-700">{checklist.itemsRechazados} Fallos</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span className="font-medium text-gray-700">{checklist.odometroInicial.valor.toLocaleString()} km</span>
                                  </div>
                                </div>

                                {checklist.cisterna && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs md:text-sm text-gray-600">
                                    <span className="font-semibold text-[#56ab2f]">Cisterna:</span> {checklist.cisterna.numero} - {checklist.cisterna.patente}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setChecklistSeleccionado(checklist);
                                    setShowDetalleChecklist(true);
                                  }}
                                  className="text-[#56ab2f] hover:text-[#a8e063] touch-target-48"
                                >
                                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarChecklist(checklist.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 touch-target-48"
                                  title="Eliminar checklist"
                                >
                                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      );
                      })()}
                    </div>
                  </div>
                )}

                {/* Tab Novedades - Optimizado móvil */}
                {activeTab === 'novedades' && (
                  <div>
                    <div className="space-y-3 md:space-y-4">
                      {novedades.length === 0 ? (
                        <div className="text-center py-12 md:py-16">
                          <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-gray-500 text-base md:text-lg font-medium">No hay novedades reportadas</p>
                          <p className="text-gray-400 text-sm mt-2">Las novedades críticas aparecerán aquí</p>
                        </div>
                      ) : (
                        novedades.map((novedad, index) => (
                          <div
                            key={`${novedad.checklistId}-${index}`}
                            className="bg-white border-l-4 border-amber-500 rounded-lg p-4 md:p-6 shadow-md hover:shadow-lg hover:border-amber-600 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setNovedadSeleccionada(novedad);
                                  setShowDetalleNovedad(true);
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="px-2 md:px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs md:text-sm font-bold">
                                    ⚠️ NOVEDAD
                                  </span>
                                  <span className="text-xs md:text-sm text-gray-600 font-semibold">
                                    Unidad INT-{novedad.unidad?.numero}
                                  </span>
                                  {/* Badge de Estado */}
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    novedad.estado === 'RESUELTA' ? 'bg-green-100 text-green-800' :
                                    novedad.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                                    novedad.estado === 'RECHAZADA' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {novedad.estado}
                                  </span>
                                </div>
                                <p className="text-sm md:text-base text-gray-800 font-medium leading-relaxed line-clamp-2">{novedad.descripcion}</p>

                                <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-gray-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatearFecha(novedad.timestamp)}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setNovedadSeleccionada(novedad);
                                    setShowDetalleNovedad(true);
                                  }}
                                  className="text-amber-600 hover:text-amber-700 touch-target-48"
                                >
                                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarNovedad(novedad.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 touch-target-48"
                                  title="Eliminar novedad"
                                >
                                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Órdenes de Trabajo - Optimizado móvil */}
                {activeTab === 'ordenes' && (
                  <div>
                    {/* Filtros optimizados para móvil */}
                    <div className="bg-gradient-to-br from-purple-50 to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-purple-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Estado</label>
                          <select
                            value={filtros.estado}
                            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as any })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Todos los estados</option>
                            <option value="PENDIENTE">⏳ PENDIENTE</option>
                            <option value="EN_PROCESO">🔧 EN PROCESO</option>
                            <option value="ESPERANDO_REPUESTOS">📦 ESPERANDO REPUESTOS</option>
                            <option value="CERRADO">✅ CERRADO</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Prioridad</label>
                          <select
                            value={filtros.prioridad}
                            onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value as any })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Todas las prioridades</option>
                            <option value="ALTA">🔴 ALTA</option>
                            <option value="MEDIA">🟡 MEDIA</option>
                            <option value="BAJA">🟢 BAJA</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={limpiarFiltros}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-lg hover:from-gray-300 hover:to-gray-400 active:scale-95 transition-all shadow-sm touch-target-48 text-sm md:text-base"
                          >
                            🔄 Limpiar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Órdenes - Optimizada móvil */}
                    <div className="space-y-3 md:space-y-4">
                      {ordenes.length === 0 ? (
                        <div className="text-center py-12 md:py-16">
                          <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <p className="text-gray-500 text-base md:text-lg font-medium">No hay órdenes de trabajo</p>
                          <p className="text-gray-400 text-sm mt-2">Las OTs generadas aparecerán aquí</p>
                        </div>
                      ) : (
                        ordenes.map((orden) => (
                          <div
                            key={orden.id}
                            className={`bg-white border-l-4 rounded-lg p-4 md:p-6 shadow-md hover:shadow-lg transition-all ${
                              orden.prioridad === 'ALTA'
                                ? 'border-red-500 hover:border-red-600'
                                : orden.prioridad === 'MEDIA'
                                ? 'border-amber-500 hover:border-amber-600'
                                : 'border-green-500 hover:border-green-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setOrdenSeleccionada(orden);
                                  setShowDetalleOrden(true);
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="text-sm md:text-base font-bold text-gray-800">
                                    OT #{orden.numeroOT || orden.id?.slice(-6)}
                                  </h3>
                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
                                    orden.prioridad === 'ALTA'
                                      ? 'bg-red-100 text-red-700'
                                      : orden.prioridad === 'MEDIA'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {orden.prioridad === 'ALTA' ? '🔴 ALTA' : orden.prioridad === 'MEDIA' ? '🟡 MEDIA' : '🟢 BAJA'}
                                  </span>
                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                                    orden.estado === 'PENDIENTE'
                                      ? 'bg-gray-100 text-gray-700'
                                      : orden.estado === 'EN_PROCESO'
                                      ? 'bg-blue-100 text-blue-700'
                                      : orden.estado === 'CERRADO'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {orden.estado === 'PENDIENTE' ? '⏳ PEND' :
                                     orden.estado === 'EN_PROCESO' ? '🔧 PROC' :
                                     orden.estado === 'CERRADO' ? '✅ OK' : '📦 REP'}
                                  </span>
                                </div>

                                <p className="text-sm md:text-base text-gray-800 font-medium mb-3 leading-relaxed">{orden.descripcion}</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-[#56ab2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                    <span className="font-semibold">INT-{orden.unidad.numero}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                                    </svg>
                                    <span className="font-semibold">{obtenerPatente(orden.unidad.numero) || orden.unidad.patente || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span className="font-semibold">{orden.tipo}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="truncate">{formatearFecha(orden.fechaCreacion)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setOrdenSeleccionada(orden);
                                    setShowDetalleOrden(true);
                                  }}
                                  className="text-purple-600 hover:text-purple-700 touch-target-48"
                                >
                                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarOrden(orden.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 touch-target-48"
                                  title="Eliminar orden de trabajo"
                                >
                                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Kanban - Vista Visual de Órdenes */}
                {activeTab === 'kanban' && (
                  <div>
                    <KanbanBoard
                      ordenes={ordenes}
                      onOrdenClick={(orden) => {
                        setOrdenSeleccionada(orden);
                        setShowDetalleOrden(true);
                      }}
                      onEstadoChange={handleEstadoChange}
                      onEliminar={eliminarOrden}
                    />
                  </div>
                )}

                {/* Tab Historial - Órdenes Completadas */}
                {activeTab === 'historial' && (
                  <div>
                    {/* Filtros para Historial */}
                    <div className="bg-gradient-to-br from-emerald-50 to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-emerald-200">
                      <h3 className="text-lg md:text-xl font-bold text-emerald-700 mb-3 md:mb-4">
                        Historial de Trabajos Completados
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="relative">
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Unidad</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder={filtros.unidad ? `Filtrado: INT-${filtros.unidad}` : "Buscar INT..."}
                              value={unidadBusqueda}
                              onChange={(e) => setUnidadBusqueda(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setFiltros({ ...filtros, unidad: unidadBusqueda });
                                  setUnidadBusqueda('');
                                }
                              }}
                              className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                              style={{ fontSize: '16px' }}
                            />
                            {filtros.unidad && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFiltros({ ...filtros, unidad: '' });
                                  setUnidadBusqueda('');
                                }}
                                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                                title="Quitar filtro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {/* Dropdown de sugerencias - solo mientras escribe */}
                          {unidadBusqueda && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-emerald-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {TODAS_LAS_UNIDADES
                                .filter(u => u.numero.includes(unidadBusqueda) || u.patente.toLowerCase().includes(unidadBusqueda.toLowerCase()))
                                .slice(0, 8)
                                .map(u => (
                                  <button
                                    key={u.numero}
                                    type="button"
                                    onClick={() => {
                                      setFiltros({ ...filtros, unidad: u.numero });
                                      setUnidadBusqueda('');
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors flex justify-between items-center"
                                  >
                                    <span className="font-semibold text-gray-800">INT-{u.numero}</span>
                                    <span className="text-sm text-gray-500">{u.patente}</span>
                                  </button>
                                ))}
                              {TODAS_LAS_UNIDADES.filter(u => u.numero.includes(unidadBusqueda) || u.patente.toLowerCase().includes(unidadBusqueda.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron unidades</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Fecha Desde</label>
                          <input
                            type="date"
                            value={filtros.fechaDesde}
                            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Fecha Hasta</label>
                          <input
                            type="date"
                            value={filtros.fechaHasta}
                            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                            className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista de Órdenes Completadas */}
                    <div className="space-y-3 md:space-y-4">
                      {ordenes
                        .filter(orden => {
                          // Solo mostrar órdenes cerradas
                          if (orden.estado !== 'CERRADO') return false;

                          // Filtro por unidad
                          if (filtros.unidad && !orden.unidad.numero.includes(filtros.unidad)) return false;

                          // Filtros por fecha
                          if (filtros.fechaDesde) {
                            const fechaOrden = new Date(orden.timestamp);
                            const fechaDesde = new Date(filtros.fechaDesde);
                            if (fechaOrden < fechaDesde) return false;
                          }
                          if (filtros.fechaHasta) {
                            const fechaOrden = new Date(orden.timestamp);
                            const fechaHasta = new Date(filtros.fechaHasta);
                            fechaHasta.setHours(23, 59, 59);
                            if (fechaOrden > fechaHasta) return false;
                          }

                          return true;
                        })
                        .map(orden => (
                          <div
                            key={orden.id}
                            onClick={() => {
                              setOrdenSeleccionada(orden);
                              setShowDetalleOrden(true);
                            }}
                            className="bg-white rounded-xl p-4 md:p-5 border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                                  <span className="text-white font-bold text-lg md:text-xl">
                                    {orden.unidad.numero}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-bold text-base md:text-lg text-gray-800">
                                    OT #{orden.numeroOT || orden.id?.slice(-6)}
                                  </div>
                                  <div className="text-sm md:text-base text-gray-600">
                                    Unidad {orden.unidad.numero} - {obtenerPatente(orden.unidad.numero) || orden.unidad.patente || 'N/A'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs md:text-sm font-semibold">
                                  ✅ COMPLETADO
                                </span>
                              </div>
                            </div>

                            <div className="text-sm md:text-base text-gray-700 mb-3 line-clamp-2">
                              {orden.descripcion}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{new Date(orden.timestamp).toLocaleDateString('es-AR')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{orden.mecanico || 'Sin asignar'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className={`font-semibold ${
                                  orden.prioridad === 'ALTA' ? 'text-red-600' :
                                  orden.prioridad === 'MEDIA' ? 'text-amber-600' :
                                  'text-green-600'
                                }`}>
                                  {orden.prioridad}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{orden.tipoMantenimiento || 'Correctivo'}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                      {ordenes.filter(o => o.estado === 'CERRADO').length === 0 && (
                        <div className="text-center py-12 md:py-16">
                          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-full mb-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-base md:text-lg text-gray-600 font-medium">
                            No hay órdenes de trabajo completadas
                          </p>
                          <p className="text-sm md:text-base text-gray-500 mt-2">
                            Las órdenes cerradas aparecerán aquí automáticamente
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Combustible - Registro de Cargas */}
                {activeTab === 'combustible' && (
                  <div>
                    {/* Header */}
                    <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border-2 border-[#0033A0]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">⛽</span>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-[#0033A0]">
                            Registro de Cargas de Combustible
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">YPF EN RUTA - Control de consumo y eficiencia</p>
                        </div>
                      </div>

                      {/* Resumen rápido */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600">Total Cargas</p>
                          <p className="text-xl md:text-2xl font-bold text-[#0033A0]">{cargas.length}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600">Total Litros</p>
                          <p className="text-xl md:text-2xl font-bold text-[#0033A0]">
                            {cargas.reduce((sum, c) => sum + c.litrosCargados, 0).toFixed(0)} L
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600">Costo Total</p>
                          <p className="text-xl md:text-2xl font-bold text-[#0033A0]">
                            ${cargas.reduce((sum, c) => sum + c.costoTotal, 0).toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600">Promedio L/Carga</p>
                          <p className="text-xl md:text-2xl font-bold text-[#0033A0]">
                            {cargas.length > 0 ? (cargas.reduce((sum, c) => sum + c.litrosCargados, 0) / cargas.length).toFixed(1) : 0} L
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de cargas */}
                    <div className="overflow-x-auto bg-white rounded-xl border-2 border-gray-200">
                      <table className="w-full">
                        <thead className="bg-[#0033A0] text-white">
                          <tr>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Fecha</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Unidad</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Km</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Litros</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Tipo</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Costo</th>
                            <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-semibold">Operador</th>
                            <th className="px-3 md:px-4 py-3 text-center text-xs md:text-sm font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cargas.length > 0 ? (
                            cargas.map((carga, index) => (
                              <tr
                                key={carga.id}
                                onClick={() => {
                                  setUnidadCombustibleSeleccionada(carga.unidad.numero);
                                  setShowDetalleCombustible(true);
                                }}
                                className={`${
                                  index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                                } hover:bg-blue-100 transition-colors border-b border-gray-200 cursor-pointer`}
                              >
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-700">
                                  {new Date(carga.fecha).toLocaleDateString('es-AR')}
                                  <span className="block text-xs text-gray-500">
                                    {new Date(carga.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-3">
                                  <div className="font-semibold text-[#0033A0] text-xs md:text-sm">
                                    INT-{carga.unidad.numero}
                                  </div>
                                  <div className="text-xs text-gray-500">{carga.unidad.patente}</div>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">
                                  {carga.kilometrajeActual.toLocaleString('es-AR')} km
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm font-semibold text-blue-700">
                                  {carga.litrosCargados.toFixed(2)} L
                                </td>
                                <td className="px-3 md:px-4 py-3">
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    carga.tipoCombustible === 'COMÚN' ? 'bg-gray-200 text-gray-700' :
                                    carga.tipoCombustible === 'INFINIA' ? 'bg-purple-200 text-purple-700' :
                                    'bg-blue-200 text-blue-700'
                                  }`}>
                                    {carga.tipoCombustible}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm font-bold text-green-700">
                                  ${carga.costoTotal.toLocaleString('es-AR')}
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600">
                                  {carga.operador}
                                </td>
                                <td className="px-3 md:px-4 py-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evitar que se abra el modal al hacer click en eliminar
                                      handleDeleteCarga(carga.id, carga.unidad.numero);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-100 transition-colors group"
                                    title="Eliminar registro"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5 text-gray-700 group-hover:text-red-600"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                  <span className="text-3xl">⛽</span>
                                </div>
                                <p className="text-lg text-gray-600 font-medium">
                                  No hay cargas de combustible registradas
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                  Las cargas aparecerán aquí cuando los choferes las registren
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones flotantes de creación - Responsive */}
      {activeTab === 'novedades' && (
        <button
          onClick={() => setShowCrearNovedad(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 md:p-5 rounded-full shadow-2xl hover:from-amber-600 hover:to-amber-700 active:scale-95 transition-all z-50 touch-target-48 group"
          aria-label="Crear novedad"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {(activeTab === 'ordenes' || activeTab === 'kanban') && (
        <button
          onClick={() => setShowCrearOrden(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 md:p-5 rounded-full shadow-2xl hover:from-purple-600 hover:to-purple-700 active:scale-95 transition-all z-50 touch-target-48 group"
          aria-label="Crear orden de trabajo"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Modal Crear Novedad */}
      {showCrearNovedad && (
        <ModalCrearNovedad
          onClose={() => setShowCrearNovedad(false)}
          onCreated={() => {
            setShowCrearNovedad(false);
            cargarDatos();
          }}
        />
      )}

      {/* Modal Detalle Combustible por Unidad */}
      {showDetalleCombustible && unidadCombustibleSeleccionada && (() => {
        const cargasUnidad = cargas.filter(c => c.unidad.numero === unidadCombustibleSeleccionada);
        const unidadInfo = cargasUnidad[0]?.unidad;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetalleCombustible(false)}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-[#0033A0] text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">⛽</span>
                    <div>
                      <h2 className="text-2xl font-bold">Unidad INT-{unidadInfo?.numero}</h2>
                      <p className="text-blue-100 text-sm">Patente: {unidadInfo?.patente} • Historial Completo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetalleCombustible(false)}
                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Estadísticas Generales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Total Cargas</p>
                    <p className="text-3xl font-bold text-[#0033A0]">{cargasUnidad.length}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Total Litros</p>
                    <p className="text-3xl font-bold text-[#0033A0]">
                      {cargasUnidad.reduce((sum, c) => sum + c.litrosCargados, 0).toFixed(0)} L
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Costo Total</p>
                    <p className="text-3xl font-bold text-[#0033A0]">
                      ${cargasUnidad.reduce((sum, c) => sum + c.costoTotal, 0).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Promedio/Carga</p>
                    <p className="text-3xl font-bold text-[#0033A0]">
                      {(cargasUnidad.reduce((sum, c) => sum + c.litrosCargados, 0) / cargasUnidad.length).toFixed(1)} L
                    </p>
                  </div>
                </div>

                {/* Consumo Calculado */}
                <DetalleConsumoUnidad unidadNumero={unidadCombustibleSeleccionada} />

                {/* Alertas de la Unidad */}
                <AlertasUnidad unidadNumero={unidadCombustibleSeleccionada} />

                {/* Historial de Cargas */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0033A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Historial de Cargas ({cargasUnidad.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cargasUnidad.map((carga) => (
                      <div key={carga.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#0033A0] transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-[#0033A0] rounded-full flex items-center justify-center text-white font-bold">
                              ⛽
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">
                                {new Date(carga.fecha).toLocaleDateString('es-AR')} - {new Date(carga.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-gray-600">Operador: {carga.operador}</div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            carga.tipoCombustible === 'COMÚN' ? 'bg-gray-200 text-gray-700' :
                            carga.tipoCombustible === 'INFINIA' ? 'bg-purple-200 text-purple-700' :
                            'bg-blue-200 text-blue-700'
                          }`}>
                            {carga.tipoCombustible}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs">Kilometraje</p>
                            <p className="font-bold text-gray-800">{carga.kilometrajeActual.toLocaleString('es-AR')} km</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Litros</p>
                            <p className="font-bold text-blue-700">{carga.litrosCargados.toFixed(2)} L</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Costo</p>
                            <p className="font-bold text-green-700">${carga.costoTotal.toLocaleString('es-AR')}</p>
                          </div>
                        </div>
                        {carga.estacionServicio && (
                          <div className="mt-2 text-xs text-gray-600">
                            📍 {carga.estacionServicio}
                          </div>
                        )}
                        {carga.observaciones && (
                          <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                            💬 {carga.observaciones}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Crear Orden de Trabajo */}
      {showCrearOrden && (
        <ModalCrearOrden
          onClose={() => setShowCrearOrden(false)}
          onCreated={() => {
            setShowCrearOrden(false);
            cargarDatos();
          }}
        />
      )}

      {/* Modal Completar Orden de Trabajo */}
      {showCompletarOrden && ordenACompletar && (
        <ModalCompletarOrden
          orden={ordenACompletar}
          onClose={() => {
            setShowCompletarOrden(false);
            setOrdenACompletar(null);
          }}
          onCompletado={() => {
            setShowCompletarOrden(false);
            setOrdenACompletar(null);
            cargarDatos();
          }}
        />
      )}

      {/* Modal Detalle/Edición Novedad */}
      {showDetalleNovedad && novedadSeleccionada && (
        <ModalDetalleNovedad
          novedad={novedadSeleccionada}
          onClose={() => {
            setShowDetalleNovedad(false);
            setNovedadSeleccionada(null);
          }}
          onUpdated={() => {
            setShowDetalleNovedad(false);
            setNovedadSeleccionada(null);
            cargarDatos();
          }}
        />
      )}

      {/* Modal Detalle/Edición Orden de Trabajo */}
      {showDetalleOrden && ordenSeleccionada && (
        <ModalDetalleOrden
          orden={ordenSeleccionada}
          onClose={() => {
            setShowDetalleOrden(false);
            setOrdenSeleccionada(null);
          }}
          onUpdated={() => {
            setShowDetalleOrden(false);
            setOrdenSeleccionada(null);
            cargarDatos();
          }}
        />
      )}

      {/* Modal Detalle Checklist Completo */}
      {showDetalleChecklist && checklistSeleccionado && (
        <ModalDetalleChecklist
          checklist={checklistSeleccionado}
          onClose={() => {
            setShowDetalleChecklist(false);
            setChecklistSeleccionado(null);
          }}
          onUpdated={() => {
            // Recargar checklists después de eliminar
            cargarDatos();
          }}
        />
      )}
    </div>
  );
};

export default DashboardMantenimiento;
