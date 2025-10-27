import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../utils/sheetsApi';

interface AuthClienteProps {
  onAuthenticated: (clienteId: string, nombreCliente: string) => void;
  onBack: () => void;
}

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

const AuthCliente: React.FC<AuthClienteProps> = ({ onAuthenticated, onBack }) => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  const handleBack = () => {
    // Clear only error messages, not blocked/attempts (security)
    setError(null);
    setCodigo('');
    onBack();
  };

  // Check if blocked on mount and cleanup on unmount
  useEffect(() => {
    const stored = localStorage.getItem('auth_cliente_blocked');
    if (stored) {
      const blockedTime = parseInt(stored);
      if (Date.now() < blockedTime) {
        setBlockedUntil(blockedTime);
      } else {
        localStorage.removeItem('auth_cliente_blocked');
        localStorage.removeItem('auth_cliente_attempts');
      }
    }

    const storedAttempts = localStorage.getItem('auth_cliente_attempts');
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts));
    }

    // Cleanup: Clear error messages when unmounting (not blocked state)
    return () => {
      setError(null);
    };
  }, []);

  // Update remaining time
  useEffect(() => {
    if (blockedUntil) {
      const interval = setInterval(() => {
        const remaining = blockedUntil - Date.now();
        if (remaining <= 0) {
          setBlockedUntil(null);
          setAttempts(0);
          setRemainingTime(0);
          localStorage.removeItem('auth_cliente_blocked');
          localStorage.removeItem('auth_cliente_attempts');
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [blockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (blockedUntil && Date.now() < blockedUntil) {
      const minutes = Math.ceil((blockedUntil - Date.now()) / 1000 / 60);
      setError(`Acceso bloqueado. Intente nuevamente en ${minutes} minuto(s).`);
      return;
    }

    if (!codigo.trim()) {
      setError('Por favor ingrese su código de acceso');
      return;
    }

    setLoading(true);

    try {
      const result = await sheetsApi.authenticateCliente(codigo.trim());

      if (result.authenticated && result.clienteId && result.nombreCliente) {
        // Reset attempts on success
        localStorage.removeItem('auth_cliente_attempts');
        localStorage.removeItem('auth_cliente_blocked');
        setAttempts(0);

        console.log('[AuthCliente] ✅ Authentication successful:', result.nombreCliente);
        onAuthenticated(result.clienteId, result.nombreCliente);
      } else {
        // Increment attempts
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('auth_cliente_attempts', newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
          // Block user
          const blockUntilTime = Date.now() + BLOCK_DURATION_MS;
          setBlockedUntil(blockUntilTime);
          localStorage.setItem('auth_cliente_blocked', blockUntilTime.toString());
          setError(`Demasiados intentos fallidos. Acceso bloqueado por 15 minutos.`);
        } else {
          const remainingAttempts = MAX_ATTEMPTS - newAttempts;
          setError(`${result.message || 'Código inválido'}. Le quedan ${remainingAttempts} intento(s).`);
        }
      }
    } catch (error) {
      console.error('[AuthCliente] Error:', error);
      setError('Error al validar código. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = blockedUntil && Date.now() < blockedUntil;
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Acceso Cliente
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Ingrese su código de acceso para consultar entregas
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Acceso
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: ABC2024XY"
                disabled={loading || !!isBlocked}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-2">
                El código es alfanumérico (letras y números)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded space-y-3">
                <p className="text-red-800 text-sm font-medium">{error}</p>
                <a
                  href="https://wa.me/541173603954?text=Hola%20CROSSLOG%2C%20necesito%20ayuda%20con%20la%20consulta%20de%20cliente"
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

            {/* Blocked Message */}
            {isBlocked && remainingTime > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded space-y-3">
                <p className="text-yellow-800 text-sm font-medium">
                  ⏱️ Tiempo restante: {Math.ceil(remainingTime / 1000 / 60)} minuto(s)
                </p>
                <a
                  href="https://wa.me/541173603954?text=Hola%20CROSSLOG%2C%20mi%20acceso%20de%20cliente%20fue%20bloqueado"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Solicitar desbloqueo por WhatsApp
                </a>
              </div>
            )}

            {/* Attempts Counter */}
            {!isBlocked && attempts > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                <p className="text-orange-800 text-sm">
                  ⚠️ Intentos restantes: {remainingAttempts} de {MAX_ATTEMPTS}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isBlocked || !codigo.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validando...
                </div>
              ) : isBlocked ? (
                'Acceso Bloqueado'
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿No tiene código de acceso? <br />
              Contacte a Crosslog Logística
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCliente;
