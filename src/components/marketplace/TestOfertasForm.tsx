import { useState } from 'react';
import type { ViajeMarketplace } from '../../utils/marketplaceApi';
import { showSuccess, showError } from '../../utils/toast';

interface TestOfertasFormProps {
  viaje: ViajeMarketplace;
  onOfertaCreada: () => void;
}

export function TestOfertasForm({ viaje, onOfertaCreada }: TestOfertasFormProps) {
  const [formData, setFormData] = useState({
    fletero_nombre: '',
    fletero_id: '',
    precio_ofertado: '',
    unidad_ofrecida: 'Semi',
    patente_unidad: '',
    chofer_asignado: '',
    telefono_chofer: '',
    mensaje_adicional: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

      const payload = {
        action: 'CREATE_MARKETPLACE_OFERTA',
        data: {
          HDR_viaje: viaje.HDR_viaje,
          fletero_nombre: formData.fletero_nombre,
          fletero_id: formData.fletero_id,
          precio_ofertado: Number(formData.precio_ofertado),
          unidad_ofrecida: formData.unidad_ofrecida,
          patente_unidad: formData.patente_unidad,
          chofer_asignado: formData.chofer_asignado,
          telefono_chofer: formData.telefono_chofer,
          tiempo_estimado_horas: 8, // Valor por defecto
          mensaje_adicional: formData.mensaje_adicional,
        }
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Oferta creada exitosamente');
        onOfertaCreada();
        // Limpiar form
        setFormData({
          fletero_nombre: '',
          fletero_id: '',
          precio_ofertado: '',
          unidad_ofrecida: 'Semi',
          patente_unidad: '',
          chofer_asignado: '',
          telefono_chofer: '',
          mensaje_adicional: '',
        });
      } else {
        showError('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error al crear oferta:', error);
      showError('Error al crear oferta: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Fleteros de prueba precargados
  const fleterosPrueba = [
    { id: 'FLT001', nombre: 'Transportes Rodríguez' },
    { id: 'FLT002', nombre: 'Logística García' },
    { id: 'FLT003', nombre: 'Fletes del Sur' },
    { id: 'FLT004', nombre: 'Transportes Norte' },
    { id: 'FLT005', nombre: 'Express Cargo' },
  ];

  const seleccionarFletero = (id: string, nombre: string) => {
    setFormData({
      ...formData,
      fletero_id: id,
      fletero_nombre: nombre,
    });
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-4 mb-4">
      <h3 className="text-lg font-bold text-blue-900 mb-3">🧪 Crear Oferta de Prueba</h3>
      <p className="text-sm text-blue-700 mb-4">Para viaje: <strong>{viaje.hdr_generado || viaje.HDR_viaje}</strong></p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Fleteros predefinidos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar Fletero</label>
          <div className="grid grid-cols-2 gap-2">
            {fleterosPrueba.map((fletero) => (
              <button
                key={fletero.id}
                type="button"
                onClick={() => seleccionarFletero(fletero.id, fletero.nombre)}
                className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  formData.fletero_id === fletero.id
                    ? 'border-blue-500 bg-blue-100 text-blue-900 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                {fletero.nombre}
              </button>
            ))}
          </div>
          {formData.fletero_id && (
            <p className="text-xs text-green-600 mt-1">✓ Seleccionado: {formData.fletero_nombre} ({formData.fletero_id})</p>
          )}
        </div>

        {/* Grid de campos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Precio Ofertado</label>
            <input
              type="number"
              value={formData.precio_ofertado}
              onChange={(e) => setFormData({ ...formData, precio_ofertado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="350000"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad Ofrecida</label>
            <select
              value={formData.unidad_ofrecida}
              onChange={(e) => setFormData({ ...formData, unidad_ofrecida: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="Semi">Semi</option>
              <option value="Balancín">Balancín</option>
              <option value="Chasis">Chasis</option>
              <option value="F100">F100</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Patente</label>
            <input
              type="text"
              value={formData.patente_unidad}
              onChange={(e) => setFormData({ ...formData, patente_unidad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="AB123CD"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Chofer</label>
            <input
              type="text"
              value={formData.chofer_asignado}
              onChange={(e) => setFormData({ ...formData, chofer_asignado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Chofer</label>
            <input
              type="tel"
              value={formData.telefono_chofer}
              onChange={(e) => setFormData({ ...formData, telefono_chofer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="1134567890"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Mensaje Adicional (opcional)</label>
          <textarea
            value={formData.mensaje_adicional}
            onChange={(e) => setFormData({ ...formData, mensaje_adicional: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            rows={2}
            placeholder="Contamos con seguro de carga completo..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Creando...' : '✅ Crear Oferta de Prueba'}
        </button>
      </form>
    </div>
  );
}
