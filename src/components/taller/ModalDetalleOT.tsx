import { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { OrdenTrabajo } from '../../types/checklist';

interface ModalDetalleOTProps {
  orden: OrdenTrabajo;
  onClose: () => void;
}

export function ModalDetalleOT({ orden, onClose }: ModalDetalleOTProps) {
  const [asignadoA, setAsignadoA] = useState(orden.asignadoA || '');
  const [comentarioInicio, setComentarioInicio] = useState(orden.comentarioInicio || '');
  const [comentarioFin, setComentarioFin] = useState(orden.comentarioFin || '');
  const [repuestos, setRepuestos] = useState(orden.repuestos?.join(', ') || '');
  const [horasTrabajo, setHorasTrabajo] = useState(orden.horasTrabajo?.toString() || '');
  const [costo, setCosto] = useState(orden.costo?.toString() || '');
  const [imagenesAntes, setImagenesAntes] = useState<File[]>([]);
  const [imagenesDespues, setImagenesDespues] = useState<File[]>([]);
  const [previewsAntes, setPreviewsAntes] = useState<string[]>(orden.fotoAntes ? [orden.fotoAntes] : []);
  const [previewsDespues, setPreviewsDespues] = useState<string[]>(orden.fotoDespues ? [orden.fotoDespues] : []);
  const [guardando, setGuardando] = useState(false);

  const handleImagenesAntesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const archivosValidos = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        return false;
      }
      return true;
    });

    setImagenesAntes(prev => [...prev, ...archivosValidos]);

    archivosValidos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewsAntes(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImagenesDespuesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const archivosValidos = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        return false;
      }
      return true;
    });

    setImagenesDespues(prev => [...prev, ...archivosValidos]);

    archivosValidos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewsDespues(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);

    try {
      // Subir imágenes "antes" si hay nuevas
      const urlsImagenesAntes: string[] = orden.fotoAntes ? [orden.fotoAntes] : [];
      for (const imagen of imagenesAntes) {
        const timestamp = Date.now();
        const nombreArchivo = `ordenes_trabajo/${orden.unidad.numero}_OT${orden.numeroOT}_antes_${timestamp}_${imagen.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenesAntes.push(url);
      }

      // Subir imágenes "después" si hay nuevas
      const urlsImagenesDespues: string[] = orden.fotoDespues ? [orden.fotoDespues] : [];
      for (const imagen of imagenesDespues) {
        const timestamp = Date.now();
        const nombreArchivo = `ordenes_trabajo/${orden.unidad.numero}_OT${orden.numeroOT}_despues_${timestamp}_${imagen.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenesDespues.push(url);
      }

      // Actualizar orden de trabajo en Firestore
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        asignadoA: asignadoA || null,
        fechaAsignacion: asignadoA && !orden.fechaAsignacion ? Timestamp.now() : orden.fechaAsignacion,
        comentarioInicio: comentarioInicio || null,
        comentarioFin: comentarioFin || null,
        repuestos: repuestos ? repuestos.split(',').map(r => r.trim()) : [],
        horasTrabajo: horasTrabajo ? parseFloat(horasTrabajo) : null,
        costo: costo ? parseFloat(costo) : null,
        fotoAntes: urlsImagenesAntes.length > 0 ? urlsImagenesAntes[0] : null,
        fotoDespues: urlsImagenesDespues.length > 0 ? urlsImagenesDespues[0] : null,
        updatedAt: Timestamp.now()
      });

      console.log('[ModalDetalleOT] Orden actualizada exitosamente');
      alert('Orden de trabajo actualizada exitosamente');
      onClose();
    } catch (error) {
      console.error('[ModalDetalleOT] Error al guardar:', error);
      alert('Error al guardar la orden de trabajo: ' + (error as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Orden de Trabajo #{String(orden.numeroOT).padStart(4, '0')}</h2>
            <p className="text-indigo-100 text-sm">Unidad {orden.unidad.numero} - {orden.unidad.patente}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                orden.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                orden.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-700' :
                orden.estado === 'ESPERANDO_REPUESTOS' ? 'bg-purple-100 text-purple-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {orden.estado}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' :
                orden.prioridad === 'MEDIA' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {orden.prioridad}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
              <p className="text-gray-800">{orden.tipo}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
              <p className="text-gray-800">{formatearFecha(orden.fecha)}</p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción del Problema</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">{orden.descripcion}</p>
            </div>
          </div>

          {/* Asignación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Asignado a</label>
            <input
              type="text"
              value={asignadoA}
              onChange={(e) => setAsignadoA(e.target.value)}
              placeholder="Nombre del técnico/mecánico"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Comentarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Comentario Inicial</label>
              <textarea
                value={comentarioInicio}
                onChange={(e) => setComentarioInicio(e.target.value)}
                placeholder="Observaciones al iniciar el trabajo..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Comentario Final</label>
              <textarea
                value={comentarioFin}
                onChange={(e) => setComentarioFin(e.target.value)}
                placeholder="Trabajo realizado, conclusiones..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Repuestos y costos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Repuestos Utilizados</label>
              <input
                type="text"
                value={repuestos}
                onChange={(e) => setRepuestos(e.target.value)}
                placeholder="Filtro, aceite, correa..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Separar con comas</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horas de Trabajo</label>
              <input
                type="number"
                step="0.5"
                value={horasTrabajo}
                onChange={(e) => setHorasTrabajo(e.target.value)}
                placeholder="2.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Costo Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="15000.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fotos - Antes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fotos ANTES de la Reparación</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagenesAntesChange}
                className="hidden"
                id="upload-antes"
              />
              <label htmlFor="upload-antes" className="flex flex-col items-center justify-center cursor-pointer">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Click para seleccionar fotos</span>
              </label>
            </div>
            {previewsAntes.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previewsAntes.map((url, index) => (
                  <img key={index} src={url} alt={`Preview antes ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-200" />
                ))}
              </div>
            )}
          </div>

          {/* Fotos - Después */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fotos DESPUÉS de la Reparación</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagenesDespuesChange}
                className="hidden"
                id="upload-despues"
              />
              <label htmlFor="upload-despues" className="flex flex-col items-center justify-center cursor-pointer">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-600">Click para seleccionar fotos</span>
              </label>
            </div>
            {previewsDespues.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previewsDespues.map((url, index) => (
                  <img key={index} src={url} alt={`Preview después ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-200" />
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
