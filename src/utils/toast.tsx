import toast from 'react-hot-toast';

/**
 * Muestra una notificación de éxito
 */
export const showSuccess = (message: string) => {
  toast.success(message);
};

/**
 * Muestra una notificación de error
 */
export const showError = (message: string) => {
  toast.error(message);
};

/**
 * Muestra una notificación informativa
 */
export const showInfo = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
  });
};

/**
 * Muestra una notificación de advertencia
 */
export const showWarning = (message: string) => {
  toast(message, {
    icon: '⚠️',
    duration: 4000,
  });
};

/**
 * Muestra un loading toast y retorna el ID para poder actualizarlo después
 */
export const showLoading = (message: string) => {
  return toast.loading(message);
};

/**
 * Actualiza un toast existente a éxito
 */
export const updateToSuccess = (toastId: string, message: string) => {
  toast.success(message, { id: toastId });
};

/**
 * Actualiza un toast existente a error
 */
export const updateToError = (toastId: string, message: string) => {
  toast.error(message, { id: toastId });
};

/**
 * Cierra un toast específico
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Muestra un diálogo de confirmación personalizado con toast
 * Retorna una Promise que resuelve a true si el usuario confirma, false si cancela
 */
export const showConfirm = (message: string, confirmText = 'Confirmar', cancelText = 'Cancelar'): Promise<boolean> => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false);
            }}
            className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true);
            }}
            className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: {
        background: '#fff',
        color: '#1f2937',
        maxWidth: '400px',
      },
    });
  });
};
