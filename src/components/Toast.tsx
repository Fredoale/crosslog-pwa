import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number; // milliseconds
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ed213a 0%, #93291e 100%)',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slide-down"
      style={{ maxWidth: '90%', width: 'auto' }}
    >
      <div
        className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white"
        style={{ background: styles.background }}
      >
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <p className="font-medium text-base sm:text-lg">
          {message}
        </p>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
