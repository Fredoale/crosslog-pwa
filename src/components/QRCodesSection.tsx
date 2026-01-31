import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { showSuccess } from '../utils/toast';

interface QRCodeData {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

const QRCodesSection: React.FC = () => {
  const baseUrl = window.location.origin;

  const qrCodes: QRCodeData[] = [
    {
      id: 'home',
      title: 'Página Principal',
      description: 'Acceso a todas las secciones de CROSSLOG',
      url: baseUrl,
      icon: '🏠',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'chofer',
      title: 'Modo Chofer',
      description: 'Iniciar entregas - Captura de fotos y firmas',
      url: `${baseUrl}/#/login`,
      icon: '🚛',
      color: 'from-sky-500 to-sky-600',
    },
    {
      id: 'cliente',
      title: 'Consulta Cliente',
      description: 'Consultar estado de entregas por cliente',
      url: `${baseUrl}/#/consulta-cliente`,
      icon: '👤',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'fletero',
      title: 'Consulta Fletero',
      description: 'Consultar viajes asignados por empresa',
      url: `${baseUrl}/#/consulta-fletero`,
      icon: '🚚',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'interno',
      title: 'Consulta Interna',
      description: 'Acceso administrativo completo',
      url: `${baseUrl}/#/consulta-interna`,
      icon: '🔐',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'whatsapp',
      title: 'Soporte WhatsApp',
      description: 'Contacto directo con asistente de CROSSLOG',
      url: 'https://wa.me/541173603954?text=Hola%20CROSSLOG%2C%20necesito%20asistencia',
      icon: '💬',
      color: 'from-green-400 to-green-500',
    },
  ];

  const handleDownloadQR = (qrId: string, _title: string) => {
    const svg = document.getElementById(`qr-${qrId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `crosslog-qr-${qrId}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyUrl = (url: string, title: string) => {
    navigator.clipboard.writeText(url);
    showSuccess(`Link de "${title}" copiado al portapapeles`);
  };

  const handlePrintQR = (qrId: string) => {
    const qrElement = document.getElementById(`qr-card-${qrId}`);
    if (!qrElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CROSSLOG QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .print-container {
              text-align: center;
              max-width: 400px;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { font-size: 14px; color: #666; margin-bottom: 20px; }
            .qr-wrapper {
              border: 4px solid #000;
              padding: 20px;
              display: inline-block;
              background: white;
            }
            @media print {
              body { background: white; }
            }
          </style>
        </head>
        <body>
          ${qrElement.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <svg className="w-8 h-8 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Códigos QR de Acceso
        </h2>
        <p className="text-gray-600 mt-2">
          Descarga, comparte o imprime estos códigos QR para facilitar el acceso a CROSSLOG
        </p>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrCodes.map((qr) => (
          <div
            key={qr.id}
            id={`qr-card-${qr.id}`}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:border-green-400 hover:shadow-lg transition-all"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${qr.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                {qr.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg">{qr.title}</h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">
              {qr.description}
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg mb-4 flex justify-center border-2 border-gray-300">
              <QRCodeSVG
                id={`qr-${qr.id}`}
                value={qr.url}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* URL */}
            <div className="bg-white rounded-lg p-2 mb-4 break-all text-xs text-gray-600 text-center border border-gray-300">
              {qr.url}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDownloadQR(qr.id, qr.title)}
                className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-green-50 rounded-lg transition-all border border-gray-300 hover:border-green-400"
                title="Descargar PNG"
              >
                <svg className="w-5 h-5 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">PNG</span>
              </button>

              <button
                onClick={() => handleCopyUrl(qr.url, qr.title)}
                className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-blue-50 rounded-lg transition-all border border-gray-300 hover:border-blue-400"
                title="Copiar Link"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">Copiar</span>
              </button>

              <button
                onClick={() => handlePrintQR(qr.id)}
                className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-green-50 rounded-lg transition-all border border-gray-300 hover:border-green-400"
                title="Imprimir"
              >
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">Imprimir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-green-50 rounded-xl border-2 border-green-200">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-[#a8e063] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold text-gray-800 mb-1">Cómo usar estos QRs:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Descargar PNG:</strong> Guarda el QR como imagen para compartir por email o WhatsApp</li>
              <li>• <strong>Copiar Link:</strong> Copia la URL para enviarla directamente</li>
              <li>• <strong>Imprimir:</strong> Imprime el QR para pegarlo en oficinas, camiones o documentos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodesSection;
