interface WelcomeModalProps {
  isOpen: boolean;
  chofer: string;
  hdr: string;
  cliente: string;
  fecha: string;
  tipoTransporte?: string;
  onAccept: () => void;
}

export function WelcomeModal({ isOpen, chofer, hdr, cliente, fecha, tipoTransporte = 'Propio', onAccept }: WelcomeModalProps) {
  if (!isOpen) return null;

  const isTercerizado = tipoTransporte && tipoTransporte !== 'Propio';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 transition-opacity"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          style={{
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div
            className="text-center py-6 px-6"
            style={{
              background: 'linear-gradient(135deg, #a8e063 0%, #7cc33f 100%)'
            }}
          >
            <div className="text-4xl mb-2">🚛</div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              ¡BIENVENIDO, {chofer.toUpperCase()}!
            </h2>
            {isTercerizado && (
              <p className="text-lg font-semibold text-white mt-2 opacity-95">
                TRANSPORTE {tipoTransporte.toUpperCase()}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* HDR Info */}
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-2">HDR {hdr}</p>
              <p className="text-lg font-bold text-gray-900">
                VIAJE DE {cliente.toUpperCase()}
              </p>
              <p className="text-sm text-gray-500 mt-1">📅 {fecha}</p>
            </div>

            {/* Safety Section */}
            <div
              className="rounded-xl p-4 border-2"
              style={{
                backgroundColor: '#eff6ff',
                borderColor: '#3b82f6'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💡</span>
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                  Recomendaciones Importantes
                </h3>
              </div>

              <ul className="space-y-2.5 text-sm text-blue-900">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>NO</strong> uses la app mientras conduces</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>La información y foto del remito confirmado deben ser <strong>cargadas al momento de la entrega</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>Solicitar al receptor <strong>firmar y aclaración</strong> e ingresarlo al sistema</span>
                </li>
              </ul>
            </div>

            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="w-full py-4 px-6 text-white text-lg font-bold rounded-xl shadow-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #a8e063 0%, #7cc33f 100%)',
                boxShadow: '0 4px 14px rgba(168, 224, 99, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 224, 99, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(168, 224, 99, 0.4)';
              }}
            >
              ✓ Entendido
            </button>

            <p className="text-xs text-center text-gray-500 pt-2">
              Al continuar, aceptás cumplir con las políticas de seguridad de CROSSLOG
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
