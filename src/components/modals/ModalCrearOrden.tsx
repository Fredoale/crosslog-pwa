/**
 * MODAL CREAR ORDEN DE TRABAJO
 * Componente reutilizable para crear nuevas órdenes de trabajo
 */

import React, { useState } from 'react';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { OrdenTrabajo } from '../../types/checklist';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

interface ModalCrearOrdenProps {
  onClose: () => void;
  onCreated: () => void;
}

export const ModalCrearOrden: React.FC<ModalCrearOrdenProps> = ({ onClose, onCreated }) => {
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
      showSuccess('Orden de trabajo creada exitosamente');
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Buscar unidad..."
                style={{ fontSize: '16px' }}
              />
              {/* Dropdown de sugerencias */}
              {mostrarSugerencias && unidadBusqueda && unidadesFiltradas.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {unidadesFiltradas.map((unidad) => (
                    <button
                      key={unidad.numero}
                      type="button"
                      onClick={() => seleccionarUnidad(unidad)}
                      className="w-full px-4 py-2 text-left hover:bg-purple-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                placeholder="Se autocompleta"
                style={{ fontSize: '16px' }}
                readOnly={!!formData.unidadPatente}
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
