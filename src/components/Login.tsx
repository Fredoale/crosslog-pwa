import { useState } from 'react';
import { useEntregasStore } from '../stores/entregasStore';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { sheetsApi } from '../utils/sheetsApi';
import { getClientFolderId, getClientName } from '../config/clientFolders';
import { WelcomeModal } from './WelcomeModal';
import ShareQRButton from './ShareQRButton';

interface LoginProps {
  onSuccess: () => void;
  onGoToConsultas?: () => void;
}

const FLETEROS = ['BARCO', 'PRODAN', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'FALZONE', 'ANDROSIUK'];

// Helper: Generate 3 random fletero options (2 false + 1 correct)
function generarOpcionesFletero(correcta: string): string[] {
  const otrosFleteros = FLETEROS.filter(f => f !== correcta);
  const shuffled = otrosFleteros.sort(() => Math.random() - 0.5);
  const dosFalsas = shuffled.slice(0, 2);
  const opciones = [...dosFalsas, correcta];
  return opciones.sort(() => Math.random() - 0.5); // Shuffle final
}

// Helper: Generate 3 random unidad options (2 false + 1 correct)
function generarOpcionesUnidad(unidades: string[], correcta: string): string[] {
  const otrasUnidades = unidades.filter(u => u !== correcta);
  const shuffled = otrasUnidades.sort(() => Math.random() - 0.5);
  const dosFalsas = shuffled.slice(0, 2);
  const opciones = [...dosFalsas, correcta];
  return opciones.sort(() => Math.random() - 0.5); // Shuffle final
}

export function Login({ onSuccess, onGoToConsultas }: LoginProps) {
  const [hdr, setHdr] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedInfo, setValidatedInfo] = useState<{ chofer: string; fecha: string } | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{ chofer: string; hdr: string; cliente: string; fecha: string; tipoTransporte?: string; isCompleted?: boolean } | null>(null);

  // Validation step state
  const [showValidationStep, setShowValidationStep] = useState(false);
  const [validationData, setValidationData] = useState<{
    tipoTransporte: string;
    unidadesDisponibles: string[];
    opciones: string[];
    correcta: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [tempHDRData, setTempHDRData] = useState<any>(null);

  const { setHDR, setEntregas, setClientInfo } = useEntregasStore();
  const { validateHDR } = useGoogleSheets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hdr.trim()) {
      setError('Por favor ingresa un HDR');
      return;
    }

    setValidating(true);

    try {
      console.log('[Login] Validating HDR:', hdr);
      const result = await validateHDR(hdr.trim());

      if (!result.valid || !result.entregas || result.entregas.length === 0) {
        setError('HDR no encontrado. Verifica el número.');
        setValidatedInfo(null);
        return;
      }

      console.log('[Login] HDR valid, entregas:', result.entregas.length);
      console.log('[Login] Chofer:', result.chofer);
      console.log('[Login] Fecha:', result.fechaViaje);
      console.log('[Login] Full result:', result);

      // Validate chofer exists
      if (!result.chofer) {
        setError('No se encontró información del chofer para este HDR');
        return;
      }

      // Check if HDR is already completed
      const todasCompletadas = result.entregas.every((e) => e.estado === 'COMPLETADO');
      console.log('[Login] ========== VERIFICACIÓN DE ESTADO ==========');
      console.log('[Login] Total entregas:', result.entregas.length);
      console.log('[Login] Estados:', result.entregas.map(e => `${e.numeroEntrega}: ${e.estado}`));
      console.log('[Login] Todas completadas:', todasCompletadas);
      console.log('[Login] ===============================================');

      // Show validated info
      setValidatedInfo({
        chofer: result.chofer,
        fecha: result.fechaViaje || 'Sin fecha',
      });

      // Load client information
      const clientId = result.entregas[0]?.cliente;
      let clientName = clientId || 'Cliente';

      if (clientId) {
        console.log('[Login] Loading client info for:', clientId);

        try {
          // Fetch client info from Maestra_Clientes
          const clientData = await sheetsApi.fetchClientInfo(clientId);

          // Get folder ID from config
          const folderId = getClientFolderId(clientId);
          clientName = clientData?.nombre || getClientName(clientId);

          // Save to store
          setClientInfo({
            id: clientId,
            nombre: clientName,
            direccion: clientData?.direccion,
            telefono: clientData?.telefono,
            tipoCarga: clientData?.tipoCarga,
            folderId: folderId,
          });

          console.log('[Login] Client info loaded:', {
            id: clientId,
            nombre: clientName,
            folderId: folderId,
          });
        } catch (error) {
          console.error('[Login] Error loading client info:', error);
          // Continue anyway - client info is optional
          clientName = getClientName(clientId);
          setClientInfo({
            id: clientId,
            nombre: clientName,
            folderId: getClientFolderId(clientId),
          });
        }
      } else {
        console.warn('[Login] No client ID found in entregas');
      }

      console.log('[Login] ✅ Tipo de transporte:', result.tipoTransporte);

      // Store temporary data for later use after validation
      setTempHDRData({
        hdr: hdr.trim(),
        chofer: result.chofer,
        tipoTransporte: result.tipoTransporte,
        entregas: result.entregas,
        clientName: clientName,
        fechaViaje: result.fechaViaje
      });

      // If HDR is completed, skip validation and go directly to welcome modal
      if (todasCompletadas) {
        console.log('[Login] HDR completado - saltando verificación de seguridad');

        // Save to store
        setHDR(hdr.trim(), result.chofer, result.tipoTransporte);
        setEntregas(result.entregas);

        // Prepare welcome modal data
        setWelcomeData({
          chofer: result.chofer,
          hdr: hdr.trim(),
          cliente: clientName,
          fecha: result.fechaViaje || 'Sin fecha',
          tipoTransporte: result.tipoTransporte,
          isCompleted: true
        });

        // Show welcome modal
        setShowWelcomeModal(true);
        return; // Skip validation step
      }

      // Generate validation options for non-completed HDRs
      const tipoTransporte = result.tipoTransporte || 'Propio';

      if (tipoTransporte === 'Propio') {
        // For "Propio", fetch the specific unidad for this HDR from BASE sheet
        try {
          const unidadCorrectaResult = await sheetsApi.fetchUnidadForHDR(hdr.trim());
          const unidades = await sheetsApi.fetchUnidadesDisponibles();

          const correcta = unidadCorrectaResult || unidades[0] || '63';

          // Generate 3 random options (2 false + 1 correct)
          const opciones = generarOpcionesUnidad(unidades, correcta);

          setValidationData({
            tipoTransporte: 'Propio',
            unidadesDisponibles: unidades,
            opciones: opciones,
            correcta: correcta
          });

          console.log('[Login] Unidad correcta para HDR', hdr, ':', correcta);
        } catch (error) {
          console.error('[Login] Error fetching unidades:', error);
          // Fallback to default options
          setValidationData({
            tipoTransporte: 'Propio',
            unidadesDisponibles: ['63', '64', '46', '813'],
            opciones: ['63', '64', '46'],
            correcta: '63'
          });
        }
      } else {
        // For fleteros, generate 3 options (2 false + 1 correct)
        const opciones = generarOpcionesFletero(tipoTransporte);

        setValidationData({
          tipoTransporte: tipoTransporte,
          unidadesDisponibles: [],
          opciones: opciones,
          correcta: tipoTransporte
        });
      }

      // Show validation step
      setShowValidationStep(true);
    } catch (err) {
      console.error('[Login] Validation error:', err);
      setError('Error conectando a Google Sheets. Verifica tu conexión.');
      setValidatedInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleAcceptWelcome = () => {
    setShowWelcomeModal(false);
    onSuccess();
  };

  const handleValidationConfirm = () => {
    if (!selectedOption || !validationData || !tempHDRData) {
      setError('Por favor selecciona una opción');
      return;
    }

    // Check if selected option is correct
    if (selectedOption !== validationData.correcta) {
      setError('La información seleccionada no coincide. Verifica los datos enviados por tu coordinador.');
      return;
    }

    // Validation passed! Continue with login flow
    setShowValidationStep(false);
    setSelectedOption(null);
    setValidationData(null);

    // Save to store
    setHDR(tempHDRData.hdr, tempHDRData.chofer, tempHDRData.tipoTransporte);
    setEntregas(tempHDRData.entregas);

    // Prepare welcome modal data
    setWelcomeData({
      chofer: tempHDRData.chofer,
      hdr: tempHDRData.hdr,
      cliente: tempHDRData.clientName,
      fecha: tempHDRData.fechaViaje || 'Sin fecha',
      tipoTransporte: tempHDRData.tipoTransporte
    });

    // Show welcome modal
    setShowWelcomeModal(true);
  };

  const handleValidationCancel = () => {
    setShowValidationStep(false);
    setSelectedOption(null);
    setValidationData(null);
    setTempHDRData(null);
    setError(null);
  };

  return (
    <>
      {/* Welcome Modal */}
      {welcomeData && (
        <WelcomeModal
          isOpen={showWelcomeModal}
          chofer={welcomeData.chofer}
          hdr={welcomeData.hdr}
          cliente={welcomeData.cliente}
          fecha={welcomeData.fecha}
          tipoTransporte={welcomeData.tipoTransporte}
          isCompleted={welcomeData.isCompleted}
          onAccept={handleAcceptWelcome}
        />
      )}

      {/* Validation Step Modal */}
      {showValidationStep && validationData && tempHDRData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="text-center py-6 px-6 bg-gradient-to-r from-yellow-400 to-orange-400">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                Verificación de Seguridad
              </h2>
              <p className="text-white text-sm mt-2 opacity-90">
                {validationData.tipoTransporte === 'Propio'
                  ? 'Selecciona tu número de unidad'
                  : 'Selecciona tu empresa de transporte'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {validationData.tipoTransporte === 'Propio' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-blue-800 text-sm font-medium">
                    ℹ️ La información solicitada fue enviada por tu coordinador a tu WhatsApp. Verifícala.
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">
                  {validationData.tipoTransporte === 'Propio'
                    ? '¿Cuál es tu número de unidad?'
                    : '¿Cuál es tu empresa de transporte?'}
                </label>

                {validationData.opciones.map((opcion) => (
                  <button
                    key={opcion}
                    onClick={() => {
                      setSelectedOption(opcion);
                      setError(null);
                    }}
                    className={`w-full p-4 rounded-xl font-semibold transition-all border-2 text-left ${
                      selectedOption === opcion
                        ? 'bg-green-500 text-white border-green-500 shadow-lg'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                    }`}
                  >
                    {validationData.tipoTransporte === 'Propio'
                      ? `Unidad ${opcion}`
                      : opcion}
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded space-y-3">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                  <a
                    href="https://wa.me/541173603954?text=Hola%20CROSSLOG%2C%20necesito%20ayuda%20con%20el%20inicio%20de%20entregas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    ¿Necesitas ayuda? Contacta soporte
                  </a>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleValidationCancel}
                  className="flex-1 py-3 px-6 text-gray-700 text-base font-semibold rounded-xl border-2 border-gray-300 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleValidationConfirm}
                  disabled={!selectedOption}
                  className="flex-1 py-3 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Screen */}
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
    }}>
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{
            background: 'linear-gradient(135deg, #a8e063 0%, #7cc33f 100%)',
            boxShadow: '0 8px 24px rgba(168, 224, 99, 0.35)'
          }}>
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="white"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-wider" style={{
            color: '#ffffff',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}>
            CROSSLOG
          </h1>
          <p className="text-xs font-semibold tracking-wide" style={{
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Servicios Logísticos | Warehousing
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-4" style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(168, 224, 99, 0.1)'
        }}>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* HDR Input */}
            <div>
              <label htmlFor="hdr" className="block text-sm font-bold mb-2" style={{
                color: '#1a2332',
                letterSpacing: '0.3px'
              }}>
                Número de HDR
              </label>
              <input
                type="text"
                id="hdr"
                value={hdr}
                onChange={(e) => setHdr(e.target.value)}
                className="w-full px-4 py-3 text-lg font-semibold border-2 rounded-xl focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: '#e5e7eb',
                  color: '#1a2332',
                  backgroundColor: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#a8e063';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(168, 224, 99, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#fafafa';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Ej: 7372022"
                disabled={validating}
                autoComplete="off"
              />
              <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                El chofer y fecha se cargan automáticamente
              </p>
            </div>

            {/* Validated Info Display */}
            {validatedInfo && (
              <div className="rounded-xl p-3 space-y-2 border-2" style={{
                backgroundColor: '#f0f9e8',
                borderColor: '#a8e063',
                boxShadow: '0 2px 8px rgba(168, 224, 99, 0.15)'
              }}>
                <div>
                  <span className="text-xs font-bold" style={{ color: '#7cc33f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👤 Chofer
                  </span>
                  <p className="text-base font-bold mt-1" style={{ color: '#1a2332' }}>{validatedInfo.chofer}</p>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: 'rgba(168, 224, 99, 0.3)' }}>
                  <span className="text-xs font-bold" style={{ color: '#7cc33f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📅 Fecha del Viaje
                  </span>
                  <p className="text-base font-bold mt-1" style={{ color: '#1a2332' }}>{validatedInfo.fecha}</p>
                </div>
              </div>
            )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 space-y-3">
              <p className="text-red-800 text-sm font-medium">{error}</p>
              <a
                href="https://wa.me/541173603954?text=Hola%20CROSSLOG%2C%20necesito%20ayuda%20con%20el%20inicio%20de%20entregas"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                ¿Necesitas ayuda? Contacta soporte
              </a>
            </div>
          )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={validating}
              className="w-full py-3 px-6 text-white text-lg font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #a8e063 0%, #7cc33f 100%)',
                boxShadow: '0 4px 14px rgba(168, 224, 99, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!validating) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 224, 99, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(168, 224, 99, 0.4)';
              }}
            >
              {validating ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Validando HDR...</span>
                </div>
              ) : (
                'Iniciar Entregas'
              )}
            </button>
          </form>

          {/* Separator */}
          {onGoToConsultas && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: '#e5e7eb' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white" style={{ color: '#9ca3af' }}>o</span>
              </div>
            </div>
          )}

          {/* Consultas Button */}
          {onGoToConsultas && (
            <button
              type="button"
              onClick={onGoToConsultas}
              className="w-full py-3 px-6 text-gray-700 text-base font-semibold rounded-xl border-2 transition-all hover:border-blue-400 hover:bg-blue-50"
              style={{
                borderColor: '#d1d5db',
                background: '#ffffff'
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Consultar entregas</span>
              </div>
            </button>
          )}

          {/* Footer */}
          <div className="text-center pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#9ca3af' }}>
              Versión 1.0.0 • CROSSLOG PWA
            </p>
            <div className="flex justify-center">
              <ShareQRButton
                url={`${window.location.origin}/#/login`}
                title="CROSSLOG - Iniciar Entregas"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
