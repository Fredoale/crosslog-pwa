import { useEffect } from 'react';
import { downloadPDFBlob } from '../../utils/pdfGenerator';

interface ModalPrevisualizacionPDFProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfBlob: Blob | null;
  fileName: string;
  titulo?: string;
}

export function ModalPrevisualizacionPDF({
  isOpen,
  onClose,
  pdfUrl,
  pdfBlob,
  fileName,
  titulo = 'Previsualización del PDF'
}: ModalPrevisualizacionPDFProps) {

  // Limpiar URL al cerrar
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen || !pdfUrl) return null;

  const handleDescargar = () => {
    if (pdfBlob) {
      downloadPDFBlob(pdfBlob, fileName);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-2 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-bold">{titulo}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="Previsualización PDF"
          />
        </div>

        {/* Footer con botones */}
        <div className="p-4 bg-gray-50 rounded-b-xl flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 truncate flex-1">
            {fileName}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              Cerrar
            </button>
            <button
              onClick={handleDescargar}
              className="px-4 py-2 bg-[#56ab2f] text-white font-semibold rounded-lg hover:bg-[#4a9428] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
